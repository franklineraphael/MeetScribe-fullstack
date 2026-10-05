import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ArrowLeft, CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';

declare global {
  interface Window {
    Paddle?: any;
  }
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '4.99',
    features: [
      '30 meetings per month',
      'AI transcription & summaries',
      'Action items & decisions',
      'Zoom + Google Meet connectors',
      'Zoom cloud recording',
      'Export to PDF / Markdown',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9.99',
    popular: true,
    features: [
      'Unlimited meetings',
      'Everything in Starter',
      'Microsoft Teams integration',
      'Custom vocabulary & speakers',
      'Priority AI processing',
      'SSO & team admin',
      'Priority support'
    ]
  }
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/paddle/subscription').then(({ data }) => setSubscription(data.subscription)).catch(() => {});
    }
  }, [user]);

  const handleCheckout = async (planId: string) => {
    if (!user) {
      window.location.href = '/register';
      return;
    }
    setLoading(planId);
    try {
      const { data } = await api.post('/paddle/create-checkout', { plan: planId });

      if (window.Paddle && import.meta.env.VITE_PADDLE_CLIENT_TOKEN) {
        window.Paddle.Environment.set(import.meta.env.VITE_PADDLE_ENV || 'sandbox');
        window.Paddle.Initialize({
          token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
          eventCallback: async (event: any) => {
            if (event.name === 'checkout.completed') {
              await refreshUser();
              window.location.href = '/app?upgraded=1';
            }
          }
        });
        window.Paddle.Checkout.open({
          items: [{ priceId: data.priceId, quantity: 1 }],
          customer: { email: data.customerEmail },
          customData: data.customData
        });
      } else {
        // Demo mode — activate instantly without real Paddle
        const demo = await api.post('/paddle/demo-activate', { plan: planId });
        await refreshUser();
        setSubscription({
          plan: demo.data.user.plan,
          status: demo.data.user.subscriptionStatus,
          meetingsLimit: demo.data.user.meetingsLimit
        });
        alert(`✅ ${planId === 'starter' ? 'Starter ($4.99)' : 'Pro ($9.99)'} plan activated!\n\n(Demo mode — no real charge. Connect Paddle for live billing.)`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.get('/paddle/portal');
      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank');
      } else {
        alert(data.message || 'Portal unavailable');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not open portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const cancelSub = async () => {
    if (!confirm('Cancel subscription at end of billing period?')) return;
    try {
      const { data } = await api.post('/paddle/cancel');
      await refreshUser();
      alert(data.message);
      const sub = await api.get('/paddle/subscription');
      setSubscription(sub.data.subscription);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-neon-purple/15 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <Link to={user ? '/app' : '/'} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-10 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Choose your <span className="text-gradient">plan</span>
          </h1>
          <p className="text-slate-400">Cancel anytime. Powered by Paddle.</p>
        </div>

        {/* Current subscription card */}
        {user && subscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="font-medium capitalize">
                  {subscription.plan} plan
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                    subscription.status === 'active'
                      ? 'bg-green-400/10 text-green-400'
                      : subscription.status === 'canceled'
                      ? 'bg-yellow-400/10 text-yellow-400'
                      : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {subscription.status}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  {subscription.meetingsUsed ?? user.meetingsUsedThisMonth} / {subscription.meetingsLimit} meetings this month
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {subscription.paddleCustomerId && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="px-4 py-2 rounded-xl glass text-sm flex items-center gap-2 hover:bg-white/10 transition"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Billing portal
                </button>
              )}
              {subscription.status === 'active' && subscription.plan !== 'free' && (
                <button
                  onClick={cancelSub}
                  className="px-4 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              whileHover={{ y: -6 }}
              className={`relative rounded-3xl p-8 ${
                plan.popular
                  ? 'bg-gradient-to-b from-neon-purple/25 to-slate-900/90 border border-neon-purple/40 shadow-xl shadow-neon-purple/15'
                  : 'glass'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-neon-purple text-xs font-semibold">
                  Recommended
                </span>
              )}
              <h2 className="font-display text-2xl font-bold mb-1">{plan.name}</h2>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">${plan.price}</span>
                <span className="text-slate-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id || (user?.plan === plan.id && subscription?.status === 'active')}
                className={`w-full py-3.5 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-neon-cyan to-neon-purple text-slate-950'
                    : 'glass hover:bg-white/10'
                }`}
              >
                {loading === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {user?.plan === plan.id && subscription?.status === 'active'
                  ? 'Current plan'
                  : loading === plan.id
                  ? 'Processing…'
                  : `Get ${plan.name}`}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Demo mode activates plans instantly. Set <code className="text-slate-400">VITE_PADDLE_CLIENT_TOKEN</code> for live Paddle checkout.
        </p>
      </div>
    </div>
  );
}
