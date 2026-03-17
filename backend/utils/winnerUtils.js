// utils/winnerUtils.js — The Riser
const Auction = require('../models/Auction');
const User = require('../models/User');
const { Bid, CreditLog } = require('../models/Bid');
const { clearAuctionAutoBids } = require('../socket/socketHandlers');
const { resetStreak } = require('./streakCounter');

/**
 * Declare winner for an auction.
 * - Marks auction as ended
 * - Deducts winning bid from winner (already reserved, just update status)
 * - Marks winning bid as 'won'
 * - Emits winner announcement via Socket.io
 */
const declareWinner = async (auction, io) => {
  if (auction.status === 'ended') {
    return { message: 'Auction already ended', auction };
  }

  await Auction.findByIdAndUpdate(auction._id, {
    status: 'ended',
    winner: auction.currentWinner,
    winningBid: auction.currentPrice,
  });

  let winnerData = null;

  if (auction.currentWinner) {
    // Mark winning bid
    await Bid.findOneAndUpdate(
      { auction: auction._id, bidder: auction.currentWinner, status: 'active' },
      { status: 'won', isWinningBid: true }
    );

    const winner = await User.findById(auction.currentWinner).select('name email credits');
    winnerData = winner;

    // Log the win deduction (credits were already reserved, this is a status update log)
    await CreditLog.create({
      user: auction.currentWinner,
      type: 'win_deduct',
      amount: -auction.currentPrice,
      balanceBefore: winner.credits + auction.currentPrice,
      balanceAfter: winner.credits,
      description: `Won auction: ${auction.title}`,
      auction: auction._id,
    });

    // Reset streak for winner on this auction
    resetStreak(auction.currentWinner.toString(), auction._id.toString());
  }

  // Clear BidPulse configs for this auction
  clearAuctionAutoBids(auction._id.toString());

  // Emit winner announcement to auction room
  if (io) {
    io.to(`auction:${auction._id}`).emit('auction:ended', {
      auctionId: auction._id,
      winner: winnerData
        ? { _id: winnerData._id, name: winnerData.name }
        : null,
      winningBid: auction.currentPrice,
      message: winnerData
        ? `🏆 "${auction.title}" won by ${winnerData.name} for ${auction.currentPrice} credits!`
        : `Auction "${auction.title}" ended with no winner.`,
    });

    // Personal notification to winner
    if (auction.currentWinner) {
      io.to(`user:${auction.currentWinner}`).emit('auction:won', {
        auctionId: auction._id,
        auctionTitle: auction.title,
        winningBid: auction.currentPrice,
        message: `🎉 Congratulations! You won "${auction.title}" for ${auction.currentPrice} credits!`,
      });
    }
  }

  console.log(`🏆 Auction ended: ${auction.title} | Winner: ${winnerData?.name || 'None'}`);

  return {
    message: 'Winner declared',
    winner: winnerData,
    winningBid: auction.currentPrice,
    auctionId: auction._id,
  };
};

module.exports = { declareWinner };
