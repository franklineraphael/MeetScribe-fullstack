import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'starter', 'pro'], default: 'free' },
  paddleCustomerId: { type: String, default: null },
  paddleSubscriptionId: { type: String, default: null },
  subscriptionStatus: { type: String, enum: ['active', 'canceled', 'past_due', 'none'], default: 'none' },
  meetingsUsedThisMonth: { type: Number, default: 0 },
  meetingsLimit: { type: Number, default: 3 }, // free tier
  integrations: {
    zoom: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    google: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    teams: {
      connected: { type: Boolean, default: false },
      accessToken: String,
      refreshToken: String
    }
  },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

export default mongoose.model('User', userSchema);
