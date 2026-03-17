// routes/credits.js — The Riser
const express = require('express');
const User = require('../models/User');
const { CreditLog } = require('../models/Bid');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/credits/balance — Bidder's own balance ──────────
router.get('/balance', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('credits bidCoins totalBidsPlaced');
    res.json({ credits: user.credits, bidCoins: user.bidCoins, totalBids: user.totalBidsPlaced });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/credits/history — Bidder's credit log ───────────
router.get('/history', protect, async (req, res) => {
  try {
    const logs = await CreditLog.find({ user: req.user._id })
      .populate('auction', 'title')
      .sort('-createdAt')
      .limit(50);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/credits/topup — Admin: assign credits to bidder
router.post('/topup', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'bidder') {
      return res.status(404).json({ message: 'Bidder not found' });
    }

    const balanceBefore = user.credits;
    await User.findByIdAndUpdate(userId, { $inc: { credits: amount } });

    await CreditLog.create({
      user: userId,
      type: 'topup',
      amount,
      balanceBefore,
      balanceAfter: balanceBefore + amount,
      description: reason || `Credits assigned by admin`,
      performedBy: req.user._id,
    });

    res.json({
      message: `Added ${amount} credits to ${user.name}`,
      newBalance: balanceBefore + amount,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/credits/deduct — Admin: deduct credits ─────────
router.post('/deduct', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'bidder') {
      return res.status(404).json({ message: 'Bidder not found' });
    }
    if (user.credits < amount) {
      return res.status(400).json({ message: 'User has insufficient credits to deduct' });
    }

    const balanceBefore = user.credits;
    await User.findByIdAndUpdate(userId, { $inc: { credits: -amount } });

    await CreditLog.create({
      user: userId,
      type: 'deduct',
      amount: -amount,
      balanceBefore,
      balanceAfter: balanceBefore - amount,
      description: reason || `Credits deducted by admin`,
      performedBy: req.user._id,
    });

    res.json({ message: `Deducted ${amount} credits from ${user.name}`, newBalance: balanceBefore - amount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/credits/users — Admin: view all bidder balances ─
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    const bidders = await User.find({ role: 'bidder', isActive: true })
      .select('name email credits bidCoins totalBidsPlaced createdAt')
      .sort('-credits');
    res.json({ bidders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
