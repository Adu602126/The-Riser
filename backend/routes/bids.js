// routes/bids.js — The Riser — CORE BIDDING ENGINE
// Team: Aditya Das (Leader), Abhishek Raj, Alok Kumar

const express = require('express');
const mongoose = require('mongoose');
const { protect, requireRole } = require('../middleware/auth');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Bid, CreditLog } = require('../models/Bid');
const { streakCounter, checkAndAwardStreak } = require('../utils/streakCounter');
const { triggerAutoBids } = require('../socket/socketHandlers');

const router = express.Router();

// ── POST /api/bids — Place a manual bid ─────────────────────
// This is the heart of the platform:
//   1. Validate auction is active & bid amount is valid
//   2. Check bidder has sufficient credits
//   3. Refund previous winner's credits
//   4. Reserve bidder's credits
//   5. Update auction current price + current winner
//   6. Emit Socket.io events (new bid, outbid notification)
//   7. Check BidPulse streak
// ─────────────────────────────────────────────────────────────
router.post('/', protect, requireRole('bidder'), async (req, res) => {
  // Use a session for atomicity
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { auctionId, amount } = req.body;
    const bidderId = req.user._id;

    // ── 1. Validate auction ──────────────────────────────────
    const auction = await Auction.findById(auctionId).session(session);
    if (!auction) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Auction not found' });
    }
    if (auction.status !== 'active') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Auction is not active' });
    }
    if (new Date() > auction.endTime) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Auction has ended' });
    }

    // ── 2. Validate bid amount ───────────────────────────────
    const minRequired = auction.currentPrice + auction.bidIncrement;
    if (amount < minRequired) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Bid must be at least ${minRequired} (current + increment)`,
        minBid: minRequired,
      });
    }

    // ── 3. Check bidder has enough credits ───────────────────
    const bidder = await User.findById(bidderId).session(session);
    if (bidder.credits < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Insufficient credits. You have ${bidder.credits}, bid requires ${amount}`,
        available: bidder.credits,
        required: amount,
      });
    }

    // Bidder cannot outbid themselves
    if (auction.currentWinner && auction.currentWinner.toString() === bidderId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'You are already the highest bidder' });
    }

    // ── 4. Refund previous highest bidder ───────────────────
    let previousWinnerId = null;
    if (auction.currentWinner) {
      previousWinnerId = auction.currentWinner;
      const prevWinner = await User.findById(previousWinnerId).session(session);

      // Find their active bid to get reserved amount
      const prevBid = await Bid.findOne({
        auction: auctionId,
        bidder: previousWinnerId,
        status: 'active',
      }).session(session);

      if (prevBid) {
        const refundAmount = prevBid.creditsReserved;

        // Refund credits to previous winner
        await User.findByIdAndUpdate(
          previousWinnerId,
          { $inc: { credits: refundAmount } },
          { session }
        );

        // Log the refund
        await CreditLog.create([{
          user: previousWinnerId,
          type: 'bid_refund',
          amount: refundAmount,
          balanceBefore: prevWinner.credits,
          balanceAfter: prevWinner.credits + refundAmount,
          description: `Outbid refund on auction: ${auction.title}`,
          auction: auctionId,
        }], { session });

        // Mark old bid as outbid
        await Bid.findByIdAndUpdate(
          prevBid._id,
          { status: 'outbid' },
          { session }
        );
      }
    }

    // ── 5. Deduct credits from new bidder (reserve) ──────────
    const bidderBalanceBefore = bidder.credits;
    await User.findByIdAndUpdate(
      bidderId,
      {
        $inc: { credits: -amount, totalBidsPlaced: 1 },
      },
      { session }
    );

    await CreditLog.create([{
      user: bidderId,
      type: 'bid_reserve',
      amount: -amount,
      balanceBefore: bidderBalanceBefore,
      balanceAfter: bidderBalanceBefore - amount,
      description: `Bid placed on auction: ${auction.title}`,
      auction: auctionId,
    }], { session });

    // ── 6. Create the bid record ─────────────────────────────
    const newBid = await Bid.create([{
      auction: auctionId,
      bidder: bidderId,
      amount,
      isAutoBid: false,
      status: 'active',
      creditsReserved: amount,
    }], { session });

    // ── 7. Update auction state ──────────────────────────────
    auction.currentPrice = amount;
    auction.currentWinner = bidderId;
    auction.totalBids += 1;
    auction.reserveMet = auction.checkReserve();
    await auction.save({ session });

    await session.commitTransaction();

    // ── 8. Emit real-time events via Socket.io ───────────────
    const io = req.app.get('io');
    const updatedBidder = await User.findById(bidderId).select('name credits');

    // New bid event → broadcast to auction room
    io.to(`auction:${auctionId}`).emit('bid:new', {
      auctionId,
      bid: {
        _id: newBid[0]._id,
        amount,
        bidder: { _id: bidderId, name: updatedBidder.name },
        isAutoBid: false,
        createdAt: new Date(),
      },
      currentPrice: amount,
      totalBids: auction.totalBids,
    });

    // ── 8b. Trigger BidPulse auto-bids for outbid users ────────
    // Non-blocking — runs after response is sent
    triggerAutoBids(auctionId.toString(), bidderId.toString(), amount, io).catch(err =>
      console.error('triggerAutoBids error:', err.message)
    );

    // Outbid notification → send directly to previous winner
    if (previousWinnerId) {
      io.to(`user:${previousWinnerId}`).emit('bid:outbid', {
        auctionId,
        auctionTitle: auction.title,
        newAmount: amount,
        message: `You were outbid on "${auction.title}". New bid: ${amount} credits. Your credits have been refunded.`,
      });
    }

    // ── 9. Check BidPulse streak ─────────────────────────────
    const streakResult = await checkAndAwardStreak(bidderId.toString(), auctionId, io);

    res.status(201).json({
      message: 'Bid placed successfully',
      bid: newBid[0],
      currentPrice: amount,
      creditsRemaining: bidderBalanceBefore - amount,
      streakResult,
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// ── GET /api/bids/auction/:auctionId — Bid history for auction
router.get('/auction/:auctionId', async (req, res) => {
  try {
    const bids = await Bid.find({ auction: req.params.auctionId })
      .populate('bidder', 'name')
      .sort('-createdAt')
      .limit(50);

    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/bids/my — Bidder's own history ──────────────────
router.get('/my', protect, requireRole('bidder'), async (req, res) => {
  try {
    const bids = await Bid.find({ bidder: req.user._id })
      .populate('auction', 'title imageUrl status endTime')
      .sort('-createdAt');

    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/bids/admin/inject — Admin: inject demo bids ────
// Lets admin add fake bids to an auction for demo purposes.
// Picks real registered bidders so everything looks authentic.
router.post('/admin/inject', protect, requireRole('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { auctionId, count = 5 } = req.body;

    const auction = await Auction.findById(auctionId).session(session);
    if (!auction) { await session.abortTransaction(); return res.status(404).json({ message: 'Auction not found' }); }
    if (auction.status === 'ended') { await session.abortTransaction(); return res.status(400).json({ message: 'Auction already ended' }); }

    // Get real bidders (not admin)
    const bidders = await User.find({ role: 'bidder', isActive: true }).limit(10).session(session);
    if (bidders.length === 0) { await session.abortTransaction(); return res.status(400).json({ message: 'No bidders registered. Run seed script first.' }); }

    let currentPrice   = auction.currentPrice;
    let currentWinner  = auction.currentWinner;
    let injectedCount  = 0;

    for (let i = 0; i < Math.min(count, 20); i++) {
      // Pick a bidder different from current winner
      const eligible = bidders.filter(b => b._id.toString() !== currentWinner?.toString());
      if (eligible.length === 0) break;
      const bidder = eligible[i % eligible.length];

      const amount = currentPrice + auction.bidIncrement;

      // Refund previous winner if exists
      if (currentWinner) {
        const prevBid = await Bid.findOne({ auction: auctionId, bidder: currentWinner, status: 'active' }).session(session);
        if (prevBid) {
          await User.findByIdAndUpdate(currentWinner, { $inc: { credits: prevBid.creditsReserved } }, { session });
          await Bid.findByIdAndUpdate(prevBid._id, { status: 'outbid' }, { session });
        }
      }

      // Ensure bidder has enough credits
      const freshBidder = await User.findById(bidder._id).session(session);
      if (freshBidder.credits < amount) {
        // Top up silently for demo purposes
        await User.findByIdAndUpdate(bidder._id, { $set: { credits: 10_000_000 } }, { session });
      }

      // Deduct credits
      await User.findByIdAndUpdate(bidder._id, { $inc: { credits: -amount, totalBidsPlaced: 1 } }, { session });

      // Create bid
      await Bid.create([{
        auction: auctionId,
        bidder:  bidder._id,
        amount,
        isAutoBid:       false,
        status:          'active',
        creditsReserved: amount,
      }], { session });

      currentPrice  = amount;
      currentWinner = bidder._id;
      injectedCount++;
    }

    // Update auction
    await Auction.findByIdAndUpdate(auctionId, {
      currentPrice,
      currentWinner,
      status:    auction.status === 'upcoming' ? 'active' : auction.status,
      $inc: { totalBids: injectedCount },
    }, { session });

    await session.commitTransaction();

    // Emit real-time update
    const io = req.app.get('io');
    const updatedAuction = await Auction.findById(auctionId).populate('currentWinner', 'name');
    if (io) {
      io.to(`auction:${auctionId}`).emit('bid:new', {
        auctionId,
        bid: { amount: currentPrice, bidder: updatedAuction.currentWinner, isAutoBid: false, createdAt: new Date() },
        currentPrice,
        totalBids: updatedAuction.totalBids,
      });
    }

    res.json({ message: `✅ ${injectedCount} demo bids injected!`, currentPrice, totalBids: updatedAuction.totalBids });
  } catch (err) {
    await session.abortTransaction();
    console.error('Inject bids error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// ── GET /api/bids/won — Bidder's won items ───────────────────
router.get('/won', protect, requireRole('bidder'), async (req, res) => {
  try {
    const wonAuctions = await Auction.find({
      winner: req.user._id,
      status: 'ended',
    }).sort('-updatedAt');

    res.json({ wonAuctions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
