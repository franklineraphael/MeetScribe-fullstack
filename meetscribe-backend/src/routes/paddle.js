import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const PLAN_LIMITS = {
  free: 3,
  starter: 30,
  pro: 9999
};

const PLAN_PRICES = {
  starter: { amount: 4.99, priceIdEnv: 'PADDLE_STARTER_PRICE_ID', fallback: 'pri_starter_499' },
  pro: { amount: 9.99, priceIdEnv: 'PADDLE_PRO_PRICE_ID', fallback: 'pri_pro_999' }
};

// @route GET /api/paddle/plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        id: 'starter',
        name: 'Starter',
        price: 4.99,
        currency: 'USD',
        interval: 'month',
        meetingsLimit: PLAN_LIMITS.starter,
        features: [
          '30 meetings / month',
          'AI transcription & summaries',
          'Zoom + Google Meet',
          'Action items & decisions',
          'Email support'
        ]
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        meetingsLimit: PLAN_LIMITS.pro,
        features: [
          'Unlimited meetings',
          'Everything in Starter',
          'Microsoft Teams',
          'Zoom cloud recording',
          'Priority processing',
          'SSO & admin controls'
        ]
      }
    ]
  });
});

// @route POST /api/paddle/create-checkout
router.post('/create-checkout', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['starter', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Use starter or pro.' });
    }

    if (req.user.plan === plan && req.user.subscriptionStatus === 'active') {
      return res.status(400).json({ success: false, message: 'You already have this plan active.' });
    }

    const priceConfig = PLAN_PRICES[plan];
    const priceId = process.env[priceConfig.priceIdEnv] || priceConfig.fallback;

    // Production: create a Paddle Transaction via API
    // POST https://api.paddle.com/transactions
    // with items: [{ price_id, quantity: 1 }], customer, custom_data

    res.json({
      success: true,
      priceId,
      plan,
      amount: priceConfig.amount,
      customerEmail: req.user.email,
      customerId: req.user.paddleCustomerId || null,
      customData: {
        userId: req.user._id.toString(),
        plan
      },
      // For Paddle.js overlay
      checkout: {
        settings: {
          successUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/app?upgraded=1`,
          displayMode: 'overlay'
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/paddle/subscription
router.get('/subscription', protect, async (req, res) => {
  try {
    const u = req.user;
    res.json({
      success: true,
      subscription: {
        plan: u.plan,
        status: u.subscriptionStatus,
        paddleCustomerId: u.paddleCustomerId,
        paddleSubscriptionId: u.paddleSubscriptionId,
        meetingsUsed: u.meetingsUsedThisMonth,
        meetingsLimit: u.meetingsLimit,
        canUpgrade: u.plan === 'free' || u.plan === 'starter',
        canDowngrade: u.plan === 'pro' || u.plan === 'starter'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/paddle/cancel
router.post('/cancel', protect, async (req, res) => {
  try {
    if (!req.user.paddleSubscriptionId) {
      return res.status(400).json({ success: false, message: 'No active subscription to cancel' });
    }

    // Production: PATCH https://api.paddle.com/subscriptions/{id}
    // body: { scheduled_change: { action: "cancel", effective_at: "next_billing_period" } }

    // Demo: mark as canceling but keep access until period end (simplified: cancel now)
    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'canceled',
      // Keep plan until end of period in real app; here we keep plan but mark canceled
    });

    res.json({
      success: true,
      message: 'Subscription scheduled for cancellation at end of billing period.',
      note: 'In production this calls Paddle API to schedule cancel at period end.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/paddle/resume
router.post('/resume', protect, async (req, res) => {
  try {
    if (req.user.subscriptionStatus !== 'canceled' || !req.user.paddleSubscriptionId) {
      return res.status(400).json({ success: false, message: 'No canceled subscription to resume' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      subscriptionStatus: 'active'
    });

    res.json({ success: true, message: 'Subscription resumed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/paddle/portal
router.get('/portal', protect, async (req, res) => {
  try {
    if (!req.user.paddleCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Paddle customer yet. Subscribe first.'
      });
    }

    // Production:
    // POST https://api.paddle.com/customers/{customer_id}/portal-sessions
    // returns { data: { urls: { general: { overview: "https://..." } } } }

    const portalUrl = process.env.PADDLE_PORTAL_URL ||
      `https://customer-portal.paddle.com/demo?customer=${req.user.paddleCustomerId}`;

    res.json({
      success: true,
      portalUrl,
      note: 'In production this is a one-time session URL from Paddle API'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/paddle/webhook
// Paddle Billing webhooks
router.post('/webhook', async (req, res) => {
  try {
    // Production: verify signature
    // const signature = req.headers['paddle-signature'];
    // verify with PADDLE_WEBHOOK_SECRET

    let event = req.body;
    if (Buffer.isBuffer(event)) {
      event = JSON.parse(event.toString());
    } else if (typeof event === 'string') {
      event = JSON.parse(event);
    }

    const eventType = event.event_type || event.alert_name || event.eventType;
    const data = event.data || event;

    console.log('[Paddle Webhook]', eventType);

    const userId =
      data.custom_data?.userId ||
      data.passthrough ||
      (typeof data.custom_data === 'string' ? JSON.parse(data.custom_data)?.userId : null);

    const customerId = data.customer_id || data.customer?.id;
    const subId = data.id || data.subscription_id || data.subscription?.id;

    // Resolve plan from price id
    const resolvePlan = (priceId) => {
      if (!priceId) return 'starter';
      const proId = process.env.PADDLE_PRO_PRICE_ID || 'pri_pro_999';
      if (String(priceId).includes('pro') || String(priceId) === proId || String(priceId).includes('999')) {
        return 'pro';
      }
      return 'starter';
    };

    if (
      eventType === 'subscription.created' ||
      eventType === 'subscription_created' ||
      eventType === 'subscription.activated'
    ) {
      const priceId =
        data.items?.[0]?.price?.id ||
        data.subscription_plan_id ||
        data.items?.[0]?.price_id;
      const plan = resolvePlan(priceId);

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          plan,
          paddleCustomerId: customerId,
          paddleSubscriptionId: subId,
          subscriptionStatus: 'active',
          meetingsLimit: PLAN_LIMITS[plan]
        });
        console.log(`[Paddle] User ${userId} → ${plan} (active)`);
      }
    }

    if (
      eventType === 'subscription.updated' ||
      eventType === 'subscription_updated' ||
      eventType === 'subscription.past_due'
    ) {
      const status = data.status || 'active';
      const priceId = data.items?.[0]?.price?.id;
      const updates = { subscriptionStatus: status };
      if (priceId) {
        const plan = resolvePlan(priceId);
        updates.plan = plan;
        updates.meetingsLimit = PLAN_LIMITS[plan];
      }
      if (userId) {
        await User.findByIdAndUpdate(userId, updates);
      }
    }

    if (
      eventType === 'subscription.canceled' ||
      eventType === 'subscription_cancelled' ||
      eventType === 'subscription.deleted'
    ) {
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          plan: 'free',
          subscriptionStatus: 'canceled',
          meetingsLimit: PLAN_LIMITS.free,
          paddleSubscriptionId: null
        });
        console.log(`[Paddle] User ${userId} canceled → free`);
      }
    }

    if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
      // Optional: record payment / reset monthly usage on renewal
      if (userId && data.custom_data?.plan) {
        const plan = data.custom_data.plan;
        await User.findByIdAndUpdate(userId, {
          plan,
          meetingsLimit: PLAN_LIMITS[plan] || PLAN_LIMITS.starter,
          subscriptionStatus: 'active',
          meetingsUsedThisMonth: 0 // reset on successful payment
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Paddle Webhook Error]', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Demo endpoint to simulate a successful subscription (no real Paddle needed)
router.post('/demo-activate', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['starter', 'pro'].includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        plan,
        paddleCustomerId: `ctm_demo_${req.user._id}`,
        paddleSubscriptionId: `sub_demo_${Date.now()}`,
        subscriptionStatus: 'active',
        meetingsLimit: PLAN_LIMITS[plan]
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: `${plan} plan activated (demo mode)`,
      user: {
        id: user._id,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        meetingsLimit: user.meetingsLimit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
