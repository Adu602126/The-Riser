// utils/streakCounter.js — The Riser — BidPulse Streak Engine
// Every 5 consecutive bids on an auction earns a BidCoin bonus
// In-memory implementation (Redis-ready interface)

const User = require('../models/User');
const { CreditLog } = require('../models/Bid');

const STREAK_THRESHOLD = 5;        // Bids needed for a reward
const BIDCOIN_REWARD = 50;         // BidCoins (credits) awarded per streak milestone

// In-memory streak store
// Structure: Map<"userId:auctionId", number>
const streakCounter = new Map();

/**
 * Increment streak for a user on a specific auction.
 * Awards BidCoin bonus every STREAK_THRESHOLD bids.
 * 
 * @param {string} userId
 * @param {string} auctionId
 * @param {object} io - Socket.io for real-time notification
 * @returns {object} { streak, rewarded, bonusAmount }
 */
const checkAndAwardStreak = async (userId, auctionId, io) => {
  const key = `${userId}:${auctionId}`;
  const currentStreak = (streakCounter.get(key) || 0) + 1;
  streakCounter.set(key, currentStreak);

  const result = { streak: currentStreak, rewarded: false, bonusAmount: 0 };

  // Award at every STREAK_THRESHOLD milestone
  if (currentStreak % STREAK_THRESHOLD === 0) {
    try {
      const user = await User.findById(userId);
      const balanceBefore = user.credits;

      // Award BidCoins (added to regular credits for simplicity)
      await User.findByIdAndUpdate(userId, {
        $inc: { credits: BIDCOIN_REWARD, bidCoins: BIDCOIN_REWARD },
      });

      await CreditLog.create({
        user: userId,
        type: 'streak_bonus',
        amount: BIDCOIN_REWARD,
        balanceBefore,
        balanceAfter: balanceBefore + BIDCOIN_REWARD,
        description: `🔥 BidPulse streak milestone! ${currentStreak} bids → +${BIDCOIN_REWARD} BidCoins`,
        auction: auctionId,
      });

      // Notify user in real-time
      if (io) {
        io.to(`user:${userId}`).emit('streak:bonus', {
          streak: currentStreak,
          bonus: BIDCOIN_REWARD,
          message: `🔥 ${STREAK_THRESHOLD}-bid streak! You earned ${BIDCOIN_REWARD} BidCoins!`,
        });
      }

      result.rewarded = true;
      result.bonusAmount = BIDCOIN_REWARD;
      console.log(`🏅 Streak bonus: user ${userId} hit ${currentStreak} bids, +${BIDCOIN_REWARD} BidCoins`);
    } catch (err) {
      console.error('Streak award error:', err.message);
    }
  }

  return result;
};

/**
 * Get current streak for a user on an auction
 */
const getStreak = (userId, auctionId) => {
  return streakCounter.get(`${userId}:${auctionId}`) || 0;
};

/**
 * Reset streak (e.g., when auction ends or user goes inactive)
 */
const resetStreak = (userId, auctionId) => {
  streakCounter.delete(`${userId}:${auctionId}`);
};

module.exports = { streakCounter, checkAndAwardStreak, getStreak, resetStreak };
