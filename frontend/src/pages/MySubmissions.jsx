// pages/MySubmissions.jsx — The Riser
// Bidder can track all their submitted auctions + approval status
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending_approval: { label: 'PENDING REVIEW',  color: '#f5ff00', bg: 'rgba(245,255,0,0.08)',  icon: '⏳' },
  upcoming:         { label: 'APPROVED — SOON',  color: '#00f5ff', bg: 'rgba(0,245,255,0.08)',  icon: '✅' },
  active:           { label: 'LIVE NOW',          color: '#00ff88', bg: 'rgba(0,255,136,0.08)', icon: '🟢' },
  ended:            { label: 'ENDED',             color: '#888',    bg: 'rgba(136,136,136,0.08)', icon: '🏁' },
  rejected:         { label: 'REJECTED',          color: '#ff2d55', bg: 'rgba(255,45,85,0.08)', icon: '❌' },
}

export default function MySubmissions() {
  const { socket }              = useSocket()
  const [auctions, setAuctions] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    api.get('/auctions/my-submissions')
      .then(({ data }) => setAuctions(data.auctions))
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false))
  }, [])

  // Live notification when approved/rejected
  useEffect(() => {
    if (!socket) return
    socket.on('auction:approved', ({ auctionId, auctionTitle, status }) => {
      setAuctions(prev => prev.map(a =>
        a._id === auctionId ? { ...a, status } : a
      ))
      toast.custom(() => (
        <div className="neo-card border-cyber-green p-4" style={{ boxShadow: '4px 4px 0 #00ff88' }}>
          <div className="text-cyber-green font-mono text-xs mb-1">✅ AUCTION APPROVED!</div>
          <div className="text-white text-sm">"{auctionTitle}" is now {status.toUpperCase()}!</div>
        </div>
      ), { duration: 6000 })
    })
    socket.on('auction:rejected', ({ auctionId, auctionTitle, reason }) => {
      setAuctions(prev => prev.map(a =>
        a._id === auctionId ? { ...a, status: 'rejected', rejectionReason: reason } : a
      ))
      toast.custom(() => (
        <div className="neo-card border-cyber-red p-4" style={{ boxShadow: '4px 4px 0 #ff2d55' }}>
          <div className="text-cyber-red font-mono text-xs mb-1">❌ AUCTION REJECTED</div>
          <div className="text-white text-sm">"{auctionTitle}" — {reason}</div>
        </div>
      ), { duration: 6000 })
    })
    return () => {
      socket.off('auction:approved')
      socket.off('auction:rejected')
    }
  }, [socket])

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        <div className="mb-8 border-b-2 border-cyber-border pb-4 flex items-end justify-between">
          <div>
            <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
              // MY AUCTION SUBMISSIONS
            </div>
            <h1 className="font-display text-4xl text-white tracking-wider">
              MY<br /><span className="text-cyber-cyan">SUBMISSIONS</span>
            </h1>
          </div>
          <Link to="/submit-auction" className="btn-cyber-cyan text-sm">
            + SUBMIT NEW ITEM
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center font-mono text-cyber-cyan animate-pulse">
            LOADING...
          </div>
        ) : auctions.length === 0 ? (
          <div className="py-24 text-center">
            <div className="font-display text-5xl text-gray-800 mb-4">EMPTY</div>
            <div className="font-mono text-sm text-gray-600 mb-6">
              You haven't submitted any auction items yet
            </div>
            <Link to="/submit-auction" className="btn-cyber-cyan">
              SUBMIT YOUR FIRST ITEM →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {auctions.map((auction, i) => {
                const cfg = STATUS_CONFIG[auction.status] || STATUS_CONFIG.ended
                return (
                  <motion.div
                    key={auction._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="neo-card border-cyber-border overflow-hidden"
                    style={{ borderColor: cfg.color + '55' }}
                  >
                    <div className="flex items-center gap-4 p-4">

                      {/* Image */}
                      <img src={auction.imageUrl} alt={auction.title}
                        className="w-20 h-20 object-cover flex-shrink-0 border border-cyber-border" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-display text-lg text-white tracking-wide truncate">
                            {auction.title}
                          </h3>
                          {/* Status badge */}
                          <span
                            className="font-mono text-xs font-bold px-2 py-0.5 flex-shrink-0"
                            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}55` }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                          <div>
                            <div className="font-mono text-xs text-gray-600">START PRICE</div>
                            <div className="font-mono text-sm text-cyber-cyan">
                              ₹{auction.startPrice.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="font-mono text-xs text-gray-600">TOTAL BIDS</div>
                            <div className="font-mono text-sm text-white">{auction.totalBids}</div>
                          </div>
                          <div>
                            <div className="font-mono text-xs text-gray-600">SUBMITTED</div>
                            <div className="font-mono text-xs text-gray-400">
                              {new Date(auction.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="font-mono text-xs text-gray-600">ENDS</div>
                            <div className="font-mono text-xs text-gray-400">
                              {new Date(auction.endTime).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Rejection reason */}
                        {auction.status === 'rejected' && auction.rejectionReason && (
                          <div className="mt-2 px-3 py-2 border border-cyber-red/30 bg-cyber-red/5">
                            <span className="font-mono text-xs text-cyber-red">
                              Reason: {auction.rejectionReason}
                            </span>
                          </div>
                        )}

                        {/* Pending tip */}
                        {auction.status === 'pending_approval' && (
                          <div className="mt-2 font-mono text-xs text-gray-600">
                            ⏳ Waiting for admin review — you'll be notified instantly
                          </div>
                        )}
                      </div>

                      {/* Action button */}
                      <div className="flex-shrink-0">
                        {(auction.status === 'active' || auction.status === 'upcoming') && (
                          <Link to={`/auctions/${auction._id}`}
                            className="font-mono text-xs text-cyber-cyan border border-cyber-cyan px-3 py-2 hover:bg-cyber-cyan hover:text-black transition-colors">
                            VIEW →
                          </Link>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
