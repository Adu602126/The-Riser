// pages/BidderAuctions.jsx — The Riser
// Smart 3-tab filtering: Active / Upcoming / Ended
// Uses real-time endTime/startTime comparison on the client
// so the UI always reflects the true state even without re-fetching.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import AuctionCard from '../components/bidder/AuctionCard'
import { api } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

// ── Helpers ──────────────────────────────────────────────────
const now = () => new Date()

/**
 * Determine the real status of an auction based on time,
 * regardless of what the DB says. This means the UI never
 * shows "active" for something that's already expired.
 */
function resolveStatus(auction) {
  const n    = now()
  const start = new Date(auction.startTime)
  const end   = new Date(auction.endTime)

  if (auction.status === 'ended' || auction.status === 'cancelled') return 'ended'
  if (end <= n)    return 'ended'
  if (start > n)   return 'upcoming'
  return 'active'
}

const TABS = [
  { key: 'active',   label: '🟢 ACTIVE',   color: 'cyber-cyan',   desc: 'Live now — bid before time runs out' },
  { key: 'upcoming', label: '🟡 UPCOMING',  color: 'cyber-yellow', desc: 'Starting soon — get ready to bid' },
  { key: 'ended',    label: '🔴 ENDED',     color: 'cyber-border', desc: 'Auctions that have closed' },
]

// ─────────────────────────────────────────────────────────────

export default function BidderAuctions() {
  const { socket } = useSocket()
  const [allAuctions, setAllAuctions] = useState([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('active')
  const [search, setSearch]           = useState('')
  const [debouncedSearch, setDebounced] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  // Fetch ALL auctions once — filtering is done client-side
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch all statuses in one request
      const { data } = await api.get('/auctions?limit=100&sort=endTime')
      setAllAuctions(data.auctions)
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Live: prepend newly created auctions
  useEffect(() => {
    if (!socket) return
    const handler = (auction) => setAllAuctions(prev => [auction, ...prev])
    socket.on('auction:created', handler)
    return () => socket.off('auction:created', handler)
  }, [socket])

  // Live: update price/status when bids come in
  useEffect(() => {
    if (!socket) return
    const handler = ({ auctionId, currentPrice, totalBids }) => {
      setAllAuctions(prev =>
        prev.map(a => a._id === auctionId ? { ...a, currentPrice, totalBids } : a)
      )
    }
    socket.on('bid:new', handler)
    return () => socket.off('bid:new', handler)
  }, [socket])

  // Live: mark auction as ended
  useEffect(() => {
    if (!socket) return
    const handler = ({ auctionId }) => {
      setAllAuctions(prev =>
        prev.map(a => a._id === auctionId ? { ...a, status: 'ended' } : a)
      )
    }
    socket.on('auction:ended', handler)
    return () => socket.off('auction:ended', handler)
  }, [socket])

  // ── Client-side filtering ─────────────────────────────────
  const filtered = useMemo(() => {
    return allAuctions
      .map(a => ({ ...a, resolvedStatus: resolveStatus(a) }))
      .filter(a => {
        const matchesTab    = a.resolvedStatus === tab
        const matchesSearch = !debouncedSearch ||
          a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          a.description.toLowerCase().includes(debouncedSearch.toLowerCase())
        return matchesTab && matchesSearch
      })
      // Sort: active by soonest end, upcoming by soonest start, ended by most recent
      .sort((a, b) => {
        if (tab === 'active')   return new Date(a.endTime)   - new Date(b.endTime)
        if (tab === 'upcoming') return new Date(a.startTime) - new Date(b.startTime)
        return new Date(b.endTime) - new Date(a.endTime)
      })
  }, [allAuctions, tab, debouncedSearch])

  // Tab counts
  const counts = useMemo(() => {
    const all = allAuctions.map(a => resolveStatus(a))
    return {
      active:   all.filter(s => s === 'active').length,
      upcoming: all.filter(s => s === 'upcoming').length,
      ended:    all.filter(s => s === 'ended').length,
    }
  }, [allAuctions])

  const activeTab = TABS.find(t => t.key === tab)

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-12">

        {/* ── Page header ────────────────────────────────────── */}
        <div className="mb-8 border-b-2 border-cyber-border pb-6">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
            // MARKETPLACE
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-white tracking-wider">
            LIVE AUCTIONS
          </h1>
          <p className="font-mono text-sm text-gray-500 mt-2">{activeTab?.desc}</p>
        </div>

        {/* ── Tab bar ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">

          {/* Status tabs */}
          <div className="flex border-2 border-cyber-border overflow-hidden">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex-1 px-4 py-2.5 font-mono text-xs uppercase tracking-widest
                  transition-colors duration-150 flex items-center justify-center gap-2
                  ${tab === t.key
                    ? `bg-${t.color} ${t.color === 'cyber-border' ? 'text-white' : 'text-black'}`
                    : 'text-gray-500 hover:text-gray-300 hover:bg-cyber-dark'
                  }`}
              >
                {t.label}
                {/* Count badge */}
                <span className={`text-xs font-bold px-1.5 py-0.5 min-w-[20px] text-center
                  ${tab === t.key
                    ? 'bg-black/20 text-inherit'
                    : 'bg-cyber-dark text-gray-400'}`}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-mono text-xs">⌕</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH AUCTIONS..."
              className="neo-input pl-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Live badge — only on active tab */}
          {tab === 'active' && filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 border-2 border-cyber-green px-4 py-2 flex-shrink-0"
              style={{ boxShadow: '3px 3px 0 #00ff88' }}
            >
              <span className="live-dot" />
              <span className="font-mono text-xs text-cyber-green font-bold">
                {filtered.length} LIVE
              </span>
            </motion.div>
          )}
        </div>

        {/* ── Auction grid ───────────────────────────────────── */}
        {loading ? (
          // Skeleton loaders
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="neo-card border-cyber-border h-80 animate-pulse">
                <div className="bg-cyber-dark w-full h-44" />
                <div className="p-4 space-y-2">
                  <div className="bg-cyber-dark h-4 w-3/4" />
                  <div className="bg-cyber-dark h-3 w-1/2" />
                  <div className="bg-cyber-dark h-3 w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // Empty state
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="font-display text-7xl text-cyber-border mb-4">
              {tab === 'active' ? '📭' : tab === 'upcoming' ? '⏳' : '🏁'}
            </div>
            <div className="font-display text-3xl text-gray-700 mb-2">
              {search
                ? 'NO RESULTS'
                : tab === 'active'   ? 'NO LIVE AUCTIONS'
                : tab === 'upcoming' ? 'NOTHING SCHEDULED'
                : 'NO ENDED AUCTIONS'}
            </div>
            <div className="font-mono text-sm text-gray-600">
              {search
                ? `No ${tab} auctions match "${search}"`
                : tab === 'active'   ? 'Check back soon — auctions go live regularly'
                : tab === 'upcoming' ? 'New auctions are created by admin'
                : 'Completed auctions will appear here'}
            </div>
          </motion.div>
        ) : (
          // Cards grid with stagger animation
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + debouncedSearch}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filtered.map((auction, i) => (
                <AuctionCard
                  key={auction._id}
                  auction={{ ...auction, status: auction.resolvedStatus }}
                  index={i}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Result count footer ────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="mt-8 text-center font-mono text-xs text-gray-700">
            showing {filtered.length} {tab} auction{filtered.length !== 1 ? 's' : ''}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </div>
        )}
      </div>
    </div>
  )
}
