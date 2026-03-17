// pages/BidderDashboard.jsx — The Riser
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../context/AuthContext'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/common/Navbar'
import toast from 'react-hot-toast'

export default function BidderDashboard() {
  const { user, refreshUser } = useAuth()
  const [bids, setBids] = useState([])
  const [creditLog, setCreditLog] = useState([])
  const [wonItems, setWonItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('bids')

  useEffect(() => {
    Promise.all([
      api.get('/bids/my'),
      api.get('/credits/history'),
      api.get('/bids/won'),
      refreshUser(),
    ])
      .then(([bidsRes, creditRes, wonRes]) => {
        setBids(bidsRes.data.bids)
        setCreditLog(creditRes.data.logs)
        setWonItems(wonRes.data.wonAuctions)
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const statusColor = (s) => {
    if (s === 'active') return 'text-cyber-cyan'
    if (s === 'won') return 'text-cyber-green'
    if (s === 's') return 'text-cyber-red'
    return 'text-gray-500'
  }

  const creditTypeColor = (t) => {
    if (t === 'topup' || t === 'bid_refund' || t === 'streak_bonus') return 'text-cyber-green'
    return 'text-cyber-red'
  }

  const creditTypeLabel = (t) => ({
    topup: '+ TOP UP',
    deduct: '− DEDUCT',
    bid_reserve: '− BID',
    bid_refund: '+ REFUND',
    win_deduct: '− WIN',
    streak_bonus: '+ STREAK',
  }[t] || t)

  return (
    <div className="min-h-screen bg-cyber-black">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs text-cyber-cyan uppercase tracking-widest mb-1">BIDDER PANEL</div>
            <h1 className="font-display text-5xl text-white">
              MY<br /><span className="text-cyber-cyan">DASHBOARD</span>
            </h1>
          </div>
          <Link to="/auctions" className="btn-cyber-cyan text-sm self-start sm:self-auto">
            BROWSE AUCTIONS →
          </Link>
        </div>

        {/* Stats row */}
        {user && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Credits', value: Number(user.credits).toLocaleString('en-IN'), color: 'text-cyber-cyan' },
              { label: 'BidCoins', value: user.bidCoins || 0, color: 'text-cyber-purple' },
              { label: 'Total Bids', value: user.totalBidsPlaced || 0, color: 'text-cyber-yellow' },
              { label: 'Items Won', value: wonItems.length, color: 'text-cyber-green' },
            ].map(({ label, value, color }) => (
              <div key={label} className="neo-card border-cyber-border p-4">
                <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</div>
                <div className={`font-display text-4xl ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b-2 border-cyber-border mb-6">
          {['bids', 'credits', 'won'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors
                ${tab === t
                  ? 'border-b-2 border-cyber-cyan text-cyber-cyan -mb-0.5'
                  : 'text-gray-500 hover:text-white'}`}>
              {t === 'bids' ? `Bid History (${bids.length})` :
               t === 'credits' ? 'Credit Log' : `Won (${wonItems.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center font-mono text-cyber-cyan animate-pulse">LOADING...</div>
        ) : (
          <>
            {/* Bid history */}
            {tab === 'bids' && (
              <div className="neo-card border-cyber-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {['Auction', 'Amount', 'Type', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-xs text-gray-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((bid, i) => (
                      <motion.tr key={bid._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-cyber-border hover:bg-cyber-dark">
                        <td className="px-4 py-3">
                          <Link to={`/auctions/${bid.auction?._id}`}
                            className="text-white hover:text-cyber-cyan truncate max-w-[180px] block">
                            {bid.auction?.title || '—'}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-mono text-cyber-cyan font-bold">{bid.amount} cr</td>
                        <td className="px-4 py-3">
                          {bid.isAutoBid
                            ? <span className="badge-auto">⚡ AUTO</span>
                            : <span className="font-mono text-xs text-gray-400">MANUAL</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs uppercase font-bold ${statusColor(bid.status)}`}>
                            {bid.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {new Date(bid.createdAt).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    ))}
                    {bids.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center font-mono text-gray-600">
                        No bids yet. <Link to="/auctions" className="text-cyber-cyan hover:underline">Start bidding →</Link>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Credit log */}
            {tab === 'credits' && (
              <div className="neo-card border-cyber-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cyber-border">
                      {['Type', 'Amount', 'Balance After', 'Description', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-mono text-xs text-gray-500 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {creditLog.map((log, i) => (
                      <motion.tr key={log._id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="border-b border-cyber-border hover:bg-cyber-dark">
                        <td className="px-4 py-3">
                          <span className={`font-mono text-xs font-bold ${creditTypeColor(log.type)}`}>
                            {creditTypeLabel(log.type)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-mono font-bold ${log.amount > 0 ? 'text-cyber-green' : 'text-cyber-red'}`}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </td>
                        <td className="px-4 py-3 font-mono text-white">{log.balanceAfter}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{log.description}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    ))}
                    {creditLog.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center font-mono text-gray-600">No credit activity yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Won items */}
            {tab === 'won' && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wonItems.map((auction, i) => (
                  <motion.div key={auction._id}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="neo-card-yellow p-4">
                    <img src={auction.imageUrl} alt={auction.title}
                      className="w-full h-36 object-cover border border-cyber-border mb-3" />
                    <div className="font-semibold text-white text-sm truncate">{auction.title}</div>
                    <div className="font-mono text-xs text-gray-500 mt-1">
                      Won for <span className="text-cyber-yellow font-bold">{auction.winningBid} credits</span>
                    </div>
                    <div className="font-mono text-xs text-gray-600 mt-0.5">
                      {new Date(auction.updatedAt).toLocaleDateString()}
                    </div>
                  </motion.div>
                ))}
                {wonItems.length === 0 && (
                  <div className="col-span-3 py-16 text-center">
                    <div className="font-display text-5xl text-gray-800 mb-3">EMPTY</div>
                    <div className="font-mono text-sm text-gray-600">You haven't won any auctions yet</div>
                    <Link to="/auctions" className="inline-block mt-4 btn-cyber-cyan text-sm">BROWSE AUCTIONS →</Link>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
