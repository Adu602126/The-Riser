// components/common/LiveBidFeed.jsx — The Riser (Futuristic Edition)
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

export default function LiveBidFeed({ bids = [], auctionId, socket }) {
  const [localBids, setLocalBids] = useState(bids)
  const [newBidId,  setNewBidId]  = useState(null)
  const feedRef = useRef(null)

  // Sync when parent passes new bids
  useEffect(() => { setLocalBids(bids) }, [bids])

  // Real-time via socket (optional — parent can also push via props)
  useEffect(() => {
    if (!socket || !auctionId) return
    const handler = ({ bid }) => {
      setLocalBids(prev => [bid, ...prev].slice(0, 50))
      setNewBidId(bid._id)
      setTimeout(() => setNewBidId(null), 1200)
    }
    socket.on('bid:new', handler)
    return () => socket.off('bid:new', handler)
  }, [socket, auctionId])

  if (localBids.length === 0) {
    return (
      <div className="neo-card border-cyber-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="live-dot" />
          <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">
            LIVE BID FEED
          </span>
        </div>
        <div className="py-8 text-center">
          <div className="font-display text-4xl text-cyber-border mb-2">NO BIDS YET</div>
          <div className="font-mono text-xs text-gray-600">Be the first to place a bid</div>
          {/* Pulsing waiting indicator */}
          <div className="flex justify-center gap-1 mt-4">
            {[0,1,2,3,4].map(i => (
              <motion.div key={i}
                className="w-1 bg-cyber-cyan"
                animate={{ height: [4, 16, 4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="neo-card border-cyber-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-cyber-border">
        <div className="flex items-center gap-2">
          <motion.span
            className="live-dot"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
            LIVE BID FEED
          </span>
        </div>
        <span className="font-mono text-xs text-gray-600">{localBids.length} bids</span>
      </div>

      {/* Bid list */}
      <div ref={feedRef} className="overflow-y-auto max-h-72">
        <AnimatePresence initial={false}>
          {localBids.map((bid, i) => {
            const isTop    = i === 0
            const isNew    = bid._id === newBidId
            const isAuto   = bid.isAutoBid

            return (
              <motion.div
                key={bid._id || i}
                layout
                initial={{ opacity: 0, x: 30, backgroundColor: 'rgba(0,245,255,0.15)' }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: isTop
                    ? 'rgba(0,245,255,0.04)'
                    : 'rgba(0,0,0,0)',
                }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.35 }}
                className={`flex items-center justify-between px-4 py-3 border-b border-cyber-border
                  relative overflow-hidden group
                  ${isTop ? 'border-l-2 border-l-cyber-cyan' : 'border-l-2 border-l-transparent'}
                `}
              >
                {/* New bid flash overlay */}
                {isNew && (
                  <motion.div
                    initial={{ opacity: 0.4, x: '-100%' }}
                    animate={{ opacity: 0, x: '100%' }}
                    transition={{ duration: 0.8 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Left: name + badges */}
                <div className="flex items-center gap-2 min-w-0">
                  {/* Rank indicator */}
                  {isTop ? (
                    <motion.span
                      className="text-cyber-cyan text-xs flex-shrink-0"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    >
                      ▶
                    </motion.span>
                  ) : (
                    <span className="text-gray-700 text-xs flex-shrink-0 w-3 text-center">
                      {i + 1}
                    </span>
                  )}

                  {isAuto && (
                    <span className="badge-auto flex-shrink-0">⚡AUTO</span>
                  )}

                  <span className={`font-mono text-sm truncate ${
                    isTop ? 'text-white font-bold' : 'text-gray-400'
                  }`}>
                    {bid.bidder?.name || 'Anonymous'}
                  </span>
                </div>

                {/* Right: amount + time */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <motion.span
                    key={bid.amount}
                    initial={{ scale: isNew ? 1.15 : 1 }}
                    animate={{ scale: 1 }}
                    className={`font-display text-xl tabular-nums ${
                      isTop ? 'text-cyber-cyan' : 'text-gray-500'
                    }`}
                  >
                    {Number(bid.amount).toLocaleString('en-IN')}
                    <span className="text-xs text-gray-600 ml-1">CR</span>
                  </motion.span>

                  <span className="font-mono text-xs text-gray-700 hidden sm:inline whitespace-nowrap">
                    {bid.createdAt
                      ? formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })
                      : 'just now'}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Bottom — scanning animation bar */}
      <div className="cyber-progress" />
    </div>
  )
}
