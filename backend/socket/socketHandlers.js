// socket/socketHandlers.js — The Riser — BidPulse Engine
// Team: Aditya Das (Leader), Abhishek Raj, Alok Kumar
//
// Handles:
//  - Room joining/leaving (auction rooms, user rooms)
//  - BidPulse: auto-bid registration + execution
//  - Real-time bid events relay

const mongoose = require('mongoose');
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Bid, CreditLog } = require('../models/Bid');
const { streakCounter, checkAndAwardStreak } = require('../utils/streakCounter');

// In-memory store for BidPulse auto-bid configs
// Structure: Map<auctionId, Map<userId, { maxBudget, lastBidAmount }>>
const autoBidConfigs = new Map();

const initSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── Join auction room for real-time bid feed ─────────────
    socket.on('auction:join', (auctionId) => {
      socket.join(`auction:${auctionId}`);
      console.log(`👀 Socket ${socket.id} joined auction:${auctionId}`);
    });

    socket.on('auction:leave', (auctionId) => {
      socket.leave(`auction:${auctionId}`);
    });

    // ── Join personal user room for notifications ────────────
    socket.on('user:join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`🔔 Socket ${socket.id} joined user:${userId}`);
    });

    // ── BidPulse: Register auto-bid config ───────────────────
    // Payload: { auctionId, userId, maxBudget }
    socket.on('bidpulse:register', async ({ auctionId, userId, maxBudget }) => {
      try {
        if (!maxBudget || maxBudget <= 0) {
          socket.emit('bidpulse:error', { message: 'Invalid max budget' });
          return;
        }

        // Validate user has enough credits for at least one bid
        const auction = await Auction.findById(auctionId);
        const user = await User.findById(userId);

        if (!auction || auction.status !== 'active') {
          socket.emit('bidpulse:error', { message: 'Auction not available' });
          return;
        }

        if (user.credits < auction.currentPrice + auction.bidIncrement) {
          socket.emit('bidpulse:error', { message: 'Insufficient credits to auto-bid' });
          return;
        }

        if (maxBudget > user.credits) {
          socket.emit('bidpulse:error', {
            message: `Max budget (${maxBudget}) exceeds your credits (${user.credits})`,
          });
          return;
        }

        // Store config
        if (!autoBidConfigs.has(auctionId)) {
          autoBidConfigs.set(auctionId, new Map());
        }
        autoBidConfigs.get(auctionId).set(userId, {
          maxBudget,
          socketId: socket.id,
        });

        socket.emit('bidpulse:confirmed', {
          auctionId,
          maxBudget,
          message: `BidPulse activated! Will auto-bid up to ${maxBudget} credits.`,
        });

        console.log(`⚡ BidPulse registered: user ${userId} on auction ${auctionId}, max ${maxBudget}`);
      } catch (err) {
        socket.emit('bidpulse:error', { message: err.message });
      }
    });

    // ── BidPulse: Cancel auto-bid ────────────────────────────
    socket.on('bidpulse:cancel', ({ auctionId, userId }) => {
      if (autoBidConfigs.has(auctionId)) {
        autoBidConfigs.get(auctionId).delete(userId);
        socket.emit('bidpulse:cancelled', { auctionId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * triggerAutoBids — Called after every manual bid to check
 * if any BidPulse users need to fire an auto-bid.
 * 
 * @param {string} auctionId
 * @param {string} newLeaderId - userId of the new highest bidder
 * @param {number} currentPrice - current auction price
 * @param {object} io - Socket.io instance
 */
const triggerAutoBids = async (auctionId, newLeaderId, currentPrice, io) => {
  const configs = autoBidConfigs.get(auctionId);
  if (!configs || configs.size === 0) return;

  // Find auto-bidders who were just outbid (not the new leader)
  for (const [userId, config] of configs.entries()) {
    if (userId === newLeaderId.toString()) continue; // They're the new leader already

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const auction = await Auction.findById(auctionId).session(session);
      if (!auction || auction.status !== 'active') break;

      const user = await User.findById(userId).session(session);
      const nextBid = auction.currentPrice + auction.bidIncrement;

      // Check max budget cap (HARD LIMIT — no overspending)
      if (nextBid > config.maxBudget) {
        console.log(`🛑 BidPulse: user ${userId} max budget reached (${config.maxBudget})`);
        configs.delete(userId);
        io.to(`user:${userId}`).emit('bidpulse:budget_reached', {
          auctionId,
          message: `BidPulse stopped: max budget of ${config.maxBudget} credits reached.`,
        });
        await session.abortTransaction();
        continue;
      }

      // Check sufficient credits
      if (user.credits < nextBid) {
        configs.delete(userId);
        io.to(`user:${userId}`).emit('bidpulse:insufficient_credits', {
          auctionId,
          message: 'BidPulse stopped: insufficient credits.',
        });
        await session.abortTransaction();
        continue;
      }

      // Refund current leader if they were a different person
      if (auction.currentWinner && auction.currentWinner.toString() !== userId) {
        const prevWinner = await User.findById(auction.currentWinner).session(session);
        const prevBid = await Bid.findOne({
          auction: auctionId,
          bidder: auction.currentWinner,
          status: 'active',
        }).session(session);

        if (prevBid) {
          await User.findByIdAndUpdate(
            auction.currentWinner,
            { $inc: { credits: prevBid.creditsReserved } },
            { session }
          );
          await CreditLog.create([{
            user: auction.currentWinner,
            type: 'bid_refund',
            amount: prevBid.creditsReserved,
            balanceBefore: prevWinner.credits,
            balanceAfter: prevWinner.credits + prevBid.creditsReserved,
            description: `Auto-bid outbid refund on: ${auction.title}`,
            auction: auctionId,
          }], { session });
          await Bid.findByIdAndUpdate(prevBid._id, { status: 'outbid' }, { session });

          // Notify the person who got auto-bid over
          io.to(`user:${auction.currentWinner}`).emit('bid:outbid', {
            auctionId,
            auctionTitle: auction.title,
            newAmount: nextBid,
            message: `Auto-bid outbid you on "${auction.title}". Bid: ${nextBid} credits. Credits refunded.`,
          });
        }
      }

      // Place the auto-bid
      const balanceBefore = user.credits;
      await User.findByIdAndUpdate(
        userId,
        { $inc: { credits: -nextBid, totalBidsPlaced: 1 } },
        { session }
      );

      await CreditLog.create([{
        user: userId,
        type: 'bid_reserve',
        amount: -nextBid,
        balanceBefore,
        balanceAfter: balanceBefore - nextBid,
        description: `[BidPulse] Auto-bid on: ${auction.title}`,
        auction: auctionId,
      }], { session });

      const autoBid = await Bid.create([{
        auction: auctionId,
        bidder: userId,
        amount: nextBid,
        isAutoBid: true,
        status: 'active',
        creditsReserved: nextBid,
      }], { session });

      auction.currentPrice = nextBid;
      auction.currentWinner = userId;
      auction.totalBids += 1;
      auction.reserveMet = auction.checkReserve();
      await auction.save({ session });

      await session.commitTransaction();

      // Emit auto-bid event to auction room
      io.to(`auction:${auctionId}`).emit('bid:new', {
        auctionId,
        bid: {
          _id: autoBid[0]._id,
          amount: nextBid,
          bidder: { _id: userId, name: user.name },
          isAutoBid: true,
          createdAt: new Date(),
        },
        currentPrice: nextBid,
        totalBids: auction.totalBids,
      });

      // Notify auto-bidder
      io.to(`user:${userId}`).emit('bidpulse:auto_bid_placed', {
        auctionId,
        amount: nextBid,
        creditsRemaining: balanceBefore - nextBid,
        message: `⚡ BidPulse auto-bid placed: ${nextBid} credits on "${auction.title}"`,
      });

      // Check streak
      await checkAndAwardStreak(userId, auctionId, io);

      console.log(`⚡ BidPulse auto-bid: user ${userId} bid ${nextBid} on ${auctionId}`);
    } catch (err) {
      await session.abortTransaction();
      console.error('BidPulse error:', err.message);
    } finally {
      session.endSession();
    }
  }
};

/**
 * clearAuctionAutoBids — Remove all auto-bid configs when auction ends
 */
const clearAuctionAutoBids = (auctionId) => {
  autoBidConfigs.delete(auctionId);
};

module.exports = { initSocketHandlers, triggerAutoBids, clearAuctionAutoBids };
