// models/Bid.js — The Riser (FIXED)
const mongoose = require('mongoose');

// ── Bid Schema ────────────────────────────────────────────────
const bidSchema = new mongoose.Schema(
  {
    auction:          { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', required: true },
    bidder:           { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    amount:           { type: Number, required: true },
    isAutoBid:        { type: Boolean, default: false },
    isWinningBid:     { type: Boolean, default: false },
    creditsReserved:  { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'outbid', 'won', 'refunded'],
      default: 'active',
    },
  },
  { timestamps: true }
);

bidSchema.index({ auction: 1, createdAt: -1 });
bidSchema.index({ bidder:  1, createdAt: -1 });

// ── CreditLog Schema ──────────────────────────────────────────
const creditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['topup', 'deduct', 'bid_reserve', 'bid_refund', 'win_deduct', 'streak_bonus'],
      required: true,
    },
    amount:        { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },
    description:   { type: String },
    auction:       { type: mongoose.Schema.Types.ObjectId, ref: 'Auction', default: null },
    performedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditLogSchema.index({ user: 1, createdAt: -1 });

// ── Single clean export — no double registration ──────────────
const Bid       = mongoose.model('Bid',       bidSchema);
const CreditLog = mongoose.model('CreditLog', creditLogSchema);

module.exports = { Bid, CreditLog };
