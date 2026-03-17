// routes/admin.js — The Riser — Admin Analytics & Reports
const express = require('express');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Bid, CreditLog } = require('../models/Bid');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/admin/analytics — Dashboard stats ───────────────
router.get('/analytics', protect, requireRole('admin'), async (req, res) => {
  try {
    const [
      totalAuctions,
      activeAuctions,
      endedAuctions,
      pendingAuctions,
      totalBidders,
      totalBids,
      recentBids,
      topBidders,
    ] = await Promise.all([
      Auction.countDocuments({ status: { $in: ['upcoming','active','ended'] } }),
      Auction.countDocuments({ status: 'active' }),
      Auction.countDocuments({ status: 'ended' }),
      Auction.countDocuments({ status: 'pending_approval' }),
      User.countDocuments({ role: 'bidder', isActive: true }),
      Bid.countDocuments(),
      Bid.find()
        .populate('bidder', 'name')
        .populate('auction', 'title')
        .sort('-createdAt')
        .limit(20),
      User.find({ role: 'bidder' })
        .select('name totalBidsPlaced credits bidCoins')
        .sort('-totalBidsPlaced')
        .limit(10),
    ]);

    res.json({
      stats: { totalAuctions, activeAuctions, endedAuctions, totalBidders, totalBids },
      pendingCount: pendingAuctions,
      recentBids,
      topBidders,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/auctions/:id/bids — Live bid feed ─────────
router.get('/auctions/:id/bids', protect, requireRole('admin'), async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.id })
      .populate('bidder', 'name email')
      .sort('-createdAt')
      .limit(100);

    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/admin/users — Manage all bidders ────────────────
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find({ role: 'bidder' })
      .select('-password')
      .sort('-createdAt');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/admin/users/:id/toggle — Suspend/activate ─────
router.patch('/users/:id/toggle', protect, requireRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({ message: 'Bidder not found' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'suspended'}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
