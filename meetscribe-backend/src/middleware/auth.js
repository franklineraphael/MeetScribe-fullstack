import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

export const checkPlan = (requiredPlans = ['starter', 'pro']) => (req, res, next) => {
  if (!requiredPlans.includes(req.user.plan) && req.user.plan !== 'pro') {
    return res.status(403).json({ 
      success: false, 
      message: 'Upgrade your plan to access this feature',
      required: requiredPlans
    });
  }
  next();
};
