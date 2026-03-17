// pages/AdminBidFeed.jsx — The Riser
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import Navbar from '../components/common/Navbar'
import CountdownTimer from '../components/common/CountdownTimer'
import toast from 'react-hot-toast'

export default function AdminBidFeed() {
  const { id } = useParams()
  const { socket } = useSocket()
  const [auction, setAuction] = useState(null)
  const [bids, setBids] = useState([])
  const [loading, setLoading] = useState(true)
  const feedRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get(`/auctions/${id}`),
      api.get(`/admin/auctions/${id}/bids`),
    ]).then(([auctionRes, bidsRes]) => {
      setAuction(auctionRes.data.auction)
      setBids(bidsRes.data.bids)
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [id])

  // Join auction socket room
  useEffect(() => {
    if (!socket) return
    socket.emit('auction:join', id)
    return () => socket.emit('auction:leave', id)
  }, [socket, id])

  // Live bid listener
  useEffect(() => {
    if (!socket) return
    const handler = ({ bid, currentPrice, totalBids }) => {
      setBids(prev => [bid, ...prev])
      setAuction(prev => prev ? { ...prev, currentPrice, totalBids } : prev)
      // Auto-scroll feed
      if (feedRef.current) feedRef.current.scrollTop = 0
    }
    socket.on('bid:new', handler)
    return () => socket.off('bid:new', handler)
  }, [socket])

  const handleDeclareWinner = async () => {
    if (!confirm('Close auction and declare winner now?')) return
    try {
      const { data } = await api.post(`/auctions/${id}/declare-winner`)
      toast.success(`🏆 Winner: ${data.winner?.name || 'No winner'}`)
      setAuction(prev => prev ? { ...prev, status: 'ended' } : prev)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center">
      <div className="font-mono text-cyber-cyan animate-pulse">LOADING FEED...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cyber-black">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Back */}
        <Link to="/admin" className="font-mono text-xs text-cyber-cyan uppercase tracking-widest hover:underline">
          ← BACK TO ADMIN
        </Link>

        {auction && (
          <div className="mt-4 mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl text-white leading-tight">{auction.title}</h1>
              <div className="flex items-center gap-4 mt-2">
                <span className={auction.status === 'active' ? 'badge-active' : 'badge-ended'}>
                  {auction.status.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-gray-500">{auction.totalBids} bids</span>
              </div>
            </div>
            {auction.status === 'active' && (
              <button onClick={handleDeclareWinner}
                className="btn-cyber-cyan text-sm whitespace-nowrap">
                🏆 DECLARE WINNER
              </button>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Auction info sidebar */}
          {auction && (
            <div className="space-y-4">
              <img src={auction.imageUrl} alt={auction.title}
                className="w-full aspect-video object-cover border-2 border-cyber-cyan" />

              <div className="neo-card-cyan p-4 space-y-3">
                <div>
                  <div className="neo-label">Current Price</div>
                  <div className="font-display text-4xl text-cyber-cyan">{auction.currentPrice}</div>
                  <div className="font-mono text-xs text-gray-500">credits</div>
                </div>
                <div>
                  <div className="neo-label">Current Leader</div>
                  <div className="font-semibold text-white">{auction.currentWinner?.name || '— none —'}</div>
                </div>
                <div>
                  <div className="neo-label">Time Remaining</div>
                  <CountdownTimer endTime={auction.endTime} />
                </div>
                <div>
                  <div className="neo-label">Bid Increment</div>
                  <div className="font-mono text-cyber-yellow">{auction.bidIncrement} cr</div>
                </div>
                {auction.reservePrice && (
                  <div>
                    <div className="neo-label">Reserve Met</div>
                    <div className={`font-mono text-sm font-bold ${auction.reserveMet ? 'text-cyber-green' : 'text-cyber-pink'}`}>
                      {auction.reserveMet ? '✓ YES' : '✗ NOT YET'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Live bid feed */}
          <div className="md:col-span-2">
            <div className="neo-card border-cyber-border">
              <div className="p-3 border-b border-cyber-border flex items-center gap-2">
                <span className="live-dot" />
                <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">LIVE BID FEED</span>
                <span className="ml-auto font-mono text-xs text-gray-600">{bids.length} bids</span>
              </div>
              <div ref={feedRef} className="overflow-y-auto max-h-[500px]">
                <AnimatePresence initial={false}>
                  {bids.map((bid, i) => (
                    <motion.div
                      key={bid._id || i}
                      initial={{ opacity: 0, x: 20, backgroundColor: 'rgba(0,245,255,0.1)' }}
                      animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                      transition={{ duration: 0.4 }}
                      className="flex items-center justify-between px-4 py-3 border-b border-cyber-border hover:bg-cyber-dark"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-8 ${i === 0 ? 'bg-cyber-cyan' : 'bg-cyber-border'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {bid.bidder?.name || 'Unknown'}
                            </span>
                            {bid.isAutoBid && <span className="badge-auto">⚡AUTO</span>}
                            {i === 0 && <span className="badge-active">LEADING</span>}
                          </div>
                          <div className="font-mono text-xs text-gray-500">
                            {new Date(bid.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="font-mono text-xl font-bold text-cyber-cyan">
                        {bid.amount}<span className="text-xs text-gray-500 ml-1">cr</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {bids.length === 0 && (
                  <div className="p-10 text-center font-mono text-gray-600 text-sm">
                    No bids yet. Watching...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
