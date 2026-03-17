// components/bidder/BidPulseModal.jsx — The Riser — Unique Feature
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../../context/SocketContext'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function BidPulseModal({ auction, userCredits, onClose, isActive, onCancel, onActivate }) {
  const { socket } = useSocket()
  const { user } = useAuth()
  const [maxBudget, setMaxBudget] = useState('')
  const [loading, setLoading] = useState(false)

  const minBudget = auction.currentPrice + auction.bidIncrement

  const handleActivate = () => {
    const budget = Number(maxBudget)

    if (!budget || budget < minBudget) {
      toast.error(`Max budget must be at least ${minBudget} credits`)
      return
    }
    if (budget > userCredits) {
      toast.error(`Max budget exceeds your credits (${userCredits})`)
      return
    }

    setLoading(true)
    socket.emit('bidpulse:register', {
      auctionId: auction._id,
      userId: user._id,
      maxBudget: budget,
    })

    socket.once('bidpulse:confirmed', ({ message }) => {
      toast.success(message)
      setLoading(false)
      if (onActivate) onActivate()  // tell parent BidPulse is now active
      onClose()
    })
    socket.once('bidpulse:error', ({ message }) => {
      toast.error(message)
      setLoading(false)
    })
  }

  const handleCancel = () => {
    socket.emit('bidpulse:cancel', { auctionId: auction._id, userId: user._id })
    onCancel()
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.85)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="neo-card-purple w-full max-w-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="border-b-2 border-cyber-purple px-6 py-4 flex items-center justify-between">
            <div>
              <div className="font-display text-2xl text-cyber-purple tracking-wider">⚡ BIDPULSE</div>
              <div className="font-mono text-xs text-gray-500">SMART AUTO-BIDDING SYSTEM</div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white font-mono text-lg">✕</button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Explainer */}
            <div className="bg-cyber-dark border border-cyber-purple/30 p-4">
              <p className="font-mono text-xs text-gray-400 leading-relaxed">
                Set a max budget and BidPulse will automatically place the minimum required bid whenever you're outbid —
                up to your limit. <span className="text-cyber-purple">100% enforced. No overspending.</span>
              </p>
            </div>

            {/* Streak info */}
            <div className="bg-cyber-dark border border-cyber-yellow/30 p-4 flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="font-mono text-xs text-cyber-yellow uppercase tracking-wider">Streak Rewards</div>
                <div className="font-mono text-xs text-gray-400 mt-0.5">
                  Every 5 bids (auto or manual) earns you <span className="text-cyber-yellow">50 BidCoins</span> bonus!
                </div>
              </div>
            </div>

            {/* Auction info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="neo-card p-3">
                <div className="font-mono text-xs text-gray-500">CURRENT BID</div>
                <div className="font-display text-xl text-cyber-cyan">{auction.currentPrice.toLocaleString()} CR</div>
              </div>
              <div className="neo-card p-3">
                <div className="font-mono text-xs text-gray-500">YOUR CREDITS</div>
                <div className="font-display text-xl text-cyber-yellow">{userCredits.toLocaleString()} CR</div>
              </div>
            </div>

            {isActive ? (
              /* Already active — show cancel */
              <div className="space-y-3">
                <div className="bg-cyber-purple/20 border border-cyber-purple p-4 text-center">
                  <div className="text-cyber-purple font-mono text-sm">⚡ BIDPULSE IS ACTIVE</div>
                  <div className="font-mono text-xs text-gray-400 mt-1">Auto-bidding on your behalf</div>
                </div>
                <button onClick={handleCancel} className="btn-cyber-red w-full">
                  DEACTIVATE BIDPULSE
                </button>
              </div>
            ) : (
              /* Setup form */
              <div className="space-y-4">
                <div>
                  <label className="neo-label">MAX BUDGET (CREDITS)</label>
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    placeholder={`Min: ${minBudget}`}
                    min={minBudget}
                    max={userCredits}
                    className="neo-input"
                  />
                  <div className="font-mono text-xs text-gray-600 mt-1">
                    Min required: {minBudget} CR · Max: {userCredits} CR
                  </div>
                </div>

                {/* Budget preview bar */}
                {maxBudget && Number(maxBudget) > 0 && (
                  <div>
                    <div className="flex justify-between font-mono text-xs text-gray-500 mb-1">
                      <span>BUDGET USAGE</span>
                      <span>{Math.round((Number(maxBudget) / userCredits) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-cyber-border">
                      <motion.div
                        className="h-full bg-cyber-purple"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((Number(maxBudget) / userCredits) * 100, 100)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleActivate}
                  disabled={loading || !maxBudget}
                  className="btn-bidpulse w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'ACTIVATING...' : '⚡ ACTIVATE BIDPULSE'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
