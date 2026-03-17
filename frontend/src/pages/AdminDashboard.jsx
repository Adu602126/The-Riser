// pages/AdminDashboard.jsx — The Riser
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import toast from 'react-hot-toast'

const StatCard = ({ label, value, color = 'cyan', icon }) => (
  <motion.div
    className={`neo-card border-cyber-${color} p-5`}
    style={{ boxShadow: `4px 4px 0 var(--cyber-${color})` }}
    whileHover={{ translateX: -2, translateY: -2 }}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
        <div className={`font-display text-4xl text-cyber-${color}`}>{value}</div>
      </div>
      <span className="text-3xl opacity-50">{icon}</span>
    </div>
  </motion.div>
)

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/auctions?sort=-createdAt&limit=10'),
      api.get('/auctions/pending'),
    ]).then(([analyticsRes, auctionsRes, pendingRes]) => {
      setData({ ...analyticsRes.data, pendingCount: pendingRes?.data?.count || 0 })
      setAuctions(auctionsRes.data.auctions)
    }).catch((err) => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const handleDeclareWinner = async (auctionId) => {
    if (!confirm('Declare winner and close this auction?')) return
    try {
      await api.post(`/auctions/${auctionId}/declare-winner`)
      toast.success('Winner declared!')
      const res = await api.get('/auctions?sort=-createdAt&limit=10')
      setAuctions(res.data.auctions)
      const ar = await api.get('/admin/analytics')
      setData(ar.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to declare winner')
    }
  }

  const handleInjectBids = async (auctionId, auctionTitle) => {
    const countStr = prompt(`How many demo bids to inject into "${auctionTitle}"?\n(Enter a number between 1–20, default is 5)`, '5')
    if (!countStr) return
    const count = Math.min(Math.max(parseInt(countStr) || 5, 1), 20)
    try {
      const { data } = await api.post('/bids/admin/inject', { auctionId, count })
      toast.success(data.message)
      // Refresh auction list
      const res = await api.get('/auctions?sort=-createdAt&limit=10')
      setAuctions(res.data.auctions)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to inject bids')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center">
      <div className="font-mono text-cyber-cyan animate-pulse">LOADING DASHBOARD...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <div className="flex items-end justify-between mb-8 border-b-2 border-cyber-border pb-4">
          <div>
            <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">// ADMIN PANEL</div>
            <h1 className="font-display text-5xl text-white tracking-wider">DASHBOARD</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/admin/pending" className="btn-cyber-outline relative">
              APPROVALS
              {data?.pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6,
                  background: '#ff2d55', color: '#fff',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 5px', minWidth: 16, textAlign: 'center',
                }}>
                  {data.pendingCount}
                </span>
              )}
            </Link>
            <Link to="/admin/auctions/create" className="btn-cyber-cyan">
              + CREATE AUCTION
            </Link>
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Total Auctions"  value={data.stats.totalAuctions}  color="cyan"   icon="🏛" />
            <StatCard label="Active"          value={data.stats.activeAuctions}  color="green"  icon="🔥" />
            <StatCard label="Ended"           value={data.stats.endedAuctions}   color="border" icon="✓"  />
            <StatCard label="Total Bidders"   value={data.stats.totalBidders}    color="purple" icon="👥" />
            <StatCard label="Total Bids"      value={data.stats.totalBids}       color="yellow" icon="⚡" />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Auction management table */}
          <div className="lg:col-span-2 neo-card border-cyber-cyan p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-cyber-border">
              <div className="font-display text-xl text-white tracking-wider">AUCTIONS</div>
              <Link to="/admin/auctions/create" className="font-mono text-xs text-cyber-cyan hover:underline">
                + NEW
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyber-border">
                    {['TITLE','STATUS','CURRENT BID','BIDS','ACTIONS'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-mono text-xs text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction, i) => (
                    <motion.tr
                      key={auction._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-cyber-border/50 hover:bg-cyber-dark/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-ui text-sm text-white truncate max-w-[180px]">{auction.title}</div>
                        <div className="font-mono text-xs text-gray-600">
                          {formatDistanceToNow(new Date(auction.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge-${auction.status}`}>{auction.status.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-cyber-cyan">
                          {auction.currentPrice?.toLocaleString('en-IN')} CR
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-gray-400">{auction.totalBids}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/auctions/${auction._id}/feed`}
                            className="font-mono text-xs text-cyber-cyan border border-cyber-cyan px-2 py-1 hover:bg-cyber-cyan hover:text-black transition-colors"
                          >
                            FEED
                          </Link>

                          {/* ── ADD DEMO BIDS button ── */}
                          {(auction.status === 'active' || auction.status === 'upcoming') && (
                            <button
                              onClick={() => handleInjectBids(auction._id, auction.title)}
                              className="font-mono text-xs text-cyber-purple border border-cyber-purple px-2 py-1 hover:bg-cyber-purple hover:text-white transition-colors"
                            >
                              + BIDS
                            </button>
                          )}

                          {auction.status === 'active' && (
                            <button
                              onClick={() => handleDeclareWinner(auction._id)}
                              className="font-mono text-xs text-cyber-yellow border border-cyber-yellow px-2 py-1 hover:bg-cyber-yellow hover:text-black transition-colors"
                            >
                              CLOSE
                            </button>
                          )}
                          {auction.status === 'upcoming' && (
                            <Link
                              to={`/admin/auctions/${auction._id}/edit`}
                              className="font-mono text-xs text-gray-400 border border-cyber-border px-2 py-1 hover:border-gray-400 transition-colors"
                            >
                              EDIT
                            </Link>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Top Bidders */}
            {data?.topBidders && (
              <div className="neo-card border-cyber-purple p-0 overflow-hidden">
                <div className="px-5 py-4 border-b-2 border-cyber-border">
                  <div className="font-display text-xl text-white tracking-wider">TOP BIDDERS</div>
                </div>
                <div className="divide-y divide-cyber-border/50">
                  {data.topBidders.map((bidder, i) => (
                    <div key={bidder._id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-2xl text-cyber-border">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <div className="font-ui text-sm text-white">{bidder.name}</div>
                          <div className="font-mono text-xs text-gray-500">{bidder.totalBidsPlaced} bids</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs text-cyber-yellow">{bidder.credits.toLocaleString('en-IN')} CR</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t-2 border-cyber-border">
                  <Link to="/admin/credits" className="font-mono text-xs text-cyber-purple hover:underline">
                    MANAGE ALL CREDITS →
                  </Link>
                </div>
              </div>
            )}

            {/* Recent bids feed */}
            {data?.recentBids && (
              <div className="neo-card border-cyber-yellow p-0 overflow-hidden">
                <div className="px-5 py-4 border-b-2 border-cyber-border">
                  <div className="flex items-center gap-2">
                    <span className="live-dot" />
                    <div className="font-display text-xl text-white tracking-wider">RECENT BIDS</div>
                  </div>
                </div>
                <div className="divide-y divide-cyber-border/50 max-h-64 overflow-y-auto">
                  {data.recentBids.slice(0, 10).map((bid) => (
                    <div key={bid._id} className="flex items-center justify-between px-5 py-2">
                      <div className="min-w-0">
                        <div className="font-ui text-xs text-white truncate">{bid.bidder?.name}</div>
                        <div className="font-mono text-xs text-gray-600 truncate">{bid.auction?.title}</div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div className="font-mono text-sm text-cyber-cyan">{bid.amount?.toLocaleString('en-IN')} CR</div>
                        {bid.isAutoBid && <span className="badge-auto text-xs">AUTO</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
