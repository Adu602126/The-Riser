// models/Auction.js — The Riser
const mongoose = require('mongoose');

const auctionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String },   // Cloudinary public_id for deletion

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    startPrice: { type: Number, required: true, min: 0 },
    reservePrice: { type: Number, default: null },      // Optional hidden reserve
    bidIncrement: { type: Number, required: true, min: 1, default: 10 },

    currentPrice: { type: Number },    // Set to startPrice on creation
    currentWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    status: {
      type: String,
      enum: ['pending_approval', 'upcoming', 'active', 'ended', 'cancelled', 'rejected'],
      default: 'upcoming',
    },

    // Bidder-submitted auction fields
    submittedByBidder: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    winningBid: { type: Number, default: null },
    totalBids: { type: Number, default: 0 },
    reserveMet: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-set currentPrice and status before save
auctionSchema.pre('save', function (next) {
  if (this.isNew) {
    this.currentPrice = this.startPrice;
    // Only set time-based status for approved auctions
    if (this.status !== 'pending_approval' && this.status !== 'rejected') {
      const now = new Date();
      if (this.startTime <= now && this.endTime > now) {
        this.status = 'active';
      } else if (this.startTime > now) {
        this.status = 'upcoming';
      }
    }
  }
  next();
});

// Virtual: is reserve met?
auctionSchema.methods.checkReserve = function () {
  if (!this.reservePrice) return true;
  return this.currentPrice >= this.reservePrice;
};

module.exports = mongoose.model('Auction', auctionSchema);
