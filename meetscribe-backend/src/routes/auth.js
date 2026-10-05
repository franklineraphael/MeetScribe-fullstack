import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '30d' });

// @route POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all fields' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'User already exists' });

    const user = await User.create({ name, email, password });
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        meetingsLimit: user.meetingsLimit
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        meetingsLimit: user.meetingsLimit,
        meetingsUsedThisMonth: user.meetingsUsedThisMonth,
        integrations: {
          zoom: user.integrations.zoom.connected,
          google: user.integrations.google.connected,
          teams: user.integrations.teams.connected
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      plan: req.user.plan,
      meetingsLimit: req.user.meetingsLimit,
      meetingsUsedThisMonth: req.user.meetingsUsedThisMonth,
      subscriptionStatus: req.user.subscriptionStatus,
      integrations: {
        zoom: req.user.integrations.zoom.connected,
        google: req.user.integrations.google.connected,
        teams: req.user.integrations.teams.connected
      }
    }
  });
});

export default router;
