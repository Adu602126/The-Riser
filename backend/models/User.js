// models/User.js — The Riser
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },          // null for OAuth users
    role: { type: String, enum: ['admin', 'bidder'], default: 'bidder' },
    credits: { type: Number, default: 10_000_000, min: 0 },  // Default: 1 Crore
    bidCoins: { type: Number, default: 0 },   // BidPulse streak bonus wallet
    googleId: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },

    // BidPulse streak tracking (per-auction resets are tracked in memory/Redis)
    totalBidsPlaced: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Never return password in responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
