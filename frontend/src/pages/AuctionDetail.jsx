// pages/AuctionDetail.jsx — The Riser — COMPLETE BIDDING EXPERIENCE
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar          from '../components/common/Navbar'
import CountdownTimer  from '../components/common/CountdownTimer'
import LiveBidFeed     from '../components/common/LiveBidFeed'
import BidPulseModal   from '../components/bidder/BidPulseModal'
import WinnerPopup     from '../components/common/WinnerPopup'
import BidBot          from '../components/common/BidBot'
import { api }         from '../context/AuthContext'
import { useAuth }     from '../context/AuthContext'
import { useSocket }   from '../context/SocketContext'
import toast           from 'react-hot-toast'

export default function AuctionDetail() {
  const { id }                    = useParams()
  const navigate                  = useNavigate()
  const { user, refreshUser }     = useAuth()
  const { socket }                = useSocket()

  // ── Core state ───────────────────────────────────────────
  const [auction,        setAuction]        = useState(null)
  const [bids,           setBids]           = useState([])
  const [loading,        setLoading]        = useState(true)
  const [bidAmount,      setBidAmount]      = useState('')
  const [placing,        setPlacing]        = useState(false)
  const [userCredits,    setUserCredits]    = useState(user?.credits || 0)
  const [currentPrice,   setCurrentPrice]   = useState(0)
  const [winnerPopup,    setWinnerPopup]    = useState(null)
  const [showBidPulse,   setShowBidPulse]   = useState(false)
  const [bidPulseActive, setBidPulseActive] = useState(false)

  // ── Visual feedback state ────────────────────────────────
  const [priceFlash,   setPriceFlash]   = useState(null)  // 'up' | 'outbid' | null
  const [bidSuccess,   setBidSuccess]   = useState(false) // green flash on MY bid
  const [outbidAlert,  setOutbidAlert]  = useState(false) // red shake
  const [recentBidder, setRecentBidder] = useState(null)  // name of last bidder
  const [streak,       setStreak]       = useState(0)
  const [streakFlash,  setStreakFlash]  = useState(false)
  const bidInputRef = useRef(null)

  // ── Load data ─────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get(`/auctions/${id}`),
      api.get(`/bids/auction/${id}`),
      api.get('/credits/balance'),
    ]).then(([aRes, bRes, cRes]) => {
      const a = aRes.data.auction
      setAuction(a)
      setBids(bRes.data.bids)
      setCurrentPrice(a.currentPrice)
      setUserCredits(cRes.data.credits)
      setBidAmount(String(a.currentPrice + a.bidIncrement))
    }).catch(() => {
      toast.error('Failed to load auction')
      navigate('/auctions')
    }).finally(() => setLoading(false))
  }, [id])

  // ── Socket events ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.emit('auction:join', id)

    // Someone placed a bid (could be me or someone else)
    const handleNewBid = ({ bid, currentPrice: newPrice, totalBids }) => {
      setCurrentPrice(newPrice)
      setAuction(prev => prev ? { ...prev, currentPrice: newPrice, totalBids,
        currentWinner: bid.bidder } : prev)
      setBids(prev => [bid, ...prev].slice(0, 50))
      setRecentBidder(bid.bidder?.name || 'Someone')

      // Was I just outbid?
      const iWasLeading = auction?.currentWinner?._id === user?._id
      const isMyBid     = bid.bidder?._id === user?._id

      if (isMyBid) {
        // My bid went through
        setBidSuccess(true)
        setPriceFlash('up')
        setStreak(s => s + 1)
        setTimeout(() => { setBidSuccess(false); setPriceFlash(null) }, 1200)
        api.get('/credits/balance').then(({ data }) => setUserCredits(data.credits))
      } else if (iWasLeading) {
        // I just got outbid!
        setOutbidAlert(true)
        setPriceFlash('outbid')
        setTimeout(() => { setOutbidAlert(false); setPriceFlash(null) }, 2000)
        api.get('/credits/balance').then(({ data }) => setUserCredits(data.credits))
        // Auto-suggest new min bid
        setBidAmount(String(newPrice + (auction?.bidIncrement || 10)))
      } else {
        setPriceFlash('up')
        setTimeout(() => setPriceFlash(null), 800)
      }

      // Preset next bid amount
      if (!isMyBid) {
        setBidAmount(String(newPrice + (auction?.bidIncrement || 10)))
      }
    }

    // Auction ended
    const handleEnded = ({ winner: w, winningBid }) => {
      setAuction(prev => prev ? { ...prev, status: 'ended', winner: w, winningBid } : prev)
      setWinnerPopup({
        winner: w, winningBid,
        auctionTitle: auction?.title || '',
        isMe: w?._id === user?._id || w === user?._id,
      })
    }

    // Streak bonus
    const handleStreak = ({ streak: s, bonus }) => {
      setStreakFlash(true)
      setTimeout(() => setStreakFlash(false), 1000)
    }

    // BidPulse auto bid placed
    const handleAutoBid = ({ amount }) => {
      toast(`⚡ BidPulse auto-bid: ${Number(amount).toLocaleString('en-IN')} CR`, { duration: 3000 })
    }

    socket.on('bid:new',              handleNewBid)
    socket.on('auction:ended',        handleEnded)
    socket.on('streak:bonus',         handleStreak)
    socket.on('bidpulse:auto_bid_placed', handleAutoBid)

    return () => {
      socket.emit('auction:leave', id)
      socket.off('bid:new',              handleNewBid)
      socket.off('auction:ended',        handleEnded)
      socket.off('streak:bonus',         handleStreak)
      socket.off('bidpulse:auto_bid_placed', handleAutoBid)
    }
  }, [socket, id, auction?.currentWinner?._id, user?._id])

  // ── Computed values ───────────────────────────────────────
  const minBid    = currentPrice + (auction?.bidIncrement || 10)
  const isLeading = auction?.currentWinner?._id === user?._id
  const isActive  = auction?.status === 'active'
  const isEnded   = auction?.status === 'ended'
  const creditsAfterBid = userCredits - Number(bidAmount || 0)
  const streakProgress  = streak % 5
  const bidPct = userCredits > 0 ? Math.min((currentPrice / userCredits) * 100, 100) : 0

  // ── Place bid ─────────────────────────────────────────────
  const handlePlaceBid = async (e) => {
    e?.preventDefault()
    const amount = Number(bidAmount)
    if (!amount || amount < minBid) {
      toast.error(`Min bid: ₹${minBid.toLocaleString('en-IN')} CR`)
      bidInputRef.current?.focus()
      return
    }
    if (amount > userCredits) {
      toast.error('Insufficient credits!')
      return
    }
    setPlacing(true)
    try {
      await api.post('/bids', { auctionId: id, amount })
      // Socket handles the UI update
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bid failed')
    } finally {
      setPlacing(false)
    }
  }

  // Quick bid buttons
  const quickBid = (extra) => {
    setBidAmount(String(minBid + extra))
    bidInputRef.current?.focus()
  }

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-cyber-black flex flex-col items-center justify-center gap-4">
      <motion.div className="font-display text-4xl text-cyber-cyan"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
        LOADING AUCTION
      </motion.div>
      <div className="cyber-progress w-48" />
    </div>
  )

  if (!auction) return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center">
      <div className="font-mono text-cyber-red">AUCTION NOT FOUND</div>
    </div>
  )

  return (
    <div className={`min-h-screen bg-cyber-black grid-bg transition-colors duration-500
      ${outbidAlert ? 'bg-red-950' : ''}`}>
      <Navbar />

      {/* ── OUTBID ALERT BANNER ────────────────────────────── */}
      <AnimatePresence>
        {outbidAlert && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 56,   opacity: 1 }}
            exit={{   y: -80,  opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center py-3 px-4"
            style={{
              background: '#ff2d55',
              boxShadow: '0 4px 30px rgba(255,45,85,0.6)',
            }}
          >
            <motion.span
              className="font-display text-2xl text-white tracking-widest"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.4, repeat: 3 }}
            >
              ⚠ YOU GOT OUTBID BY {recentBidder?.toUpperCase()}! PLACE A COUNTER-BID NOW!
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16">

        {/* Back button */}
        <button onClick={() => navigate('/auctions')}
          className="font-mono text-xs text-gray-600 hover:text-cyber-cyan mb-6 flex items-center gap-2 uppercase tracking-widest transition-colors">
          ← BACK TO AUCTIONS
        </button>

        <div className="grid lg:grid-cols-5 gap-6">

          {/* ══════════════════════════════════════════════════
              LEFT COL (3) — Image + Info + Live Feed
          ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 space-y-5">

            {/* ── ITEM IMAGE ──────────────────────────────── */}
            <div className="relative overflow-hidden"
              style={{
                border: `2px solid ${isActive ? '#00f5ff' : isEnded ? '#f5ff00' : '#2a2a2a'}`,
                boxShadow: isActive ? '0 0 30px rgba(0,245,255,0.15)' : 'none',
                transition: 'all 0.5s',
              }}>

              <img src={auction.imageUrl} alt={auction.title}
                className="w-full aspect-video object-cover" />

              {/* Status badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                {isActive && (
                  <motion.div className="flex items-center gap-1.5 bg-black/70 px-3 py-1.5 border border-cyber-green"
                    animate={{ borderColor: ['#00ff88', '#00f5ff', '#00ff88'] }}
                    transition={{ duration: 2, repeat: Infinity }}>
                    <motion.span className="w-2 h-2 rounded-full bg-cyber-red inline-block"
                      animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                    <span className="font-mono text-xs text-white uppercase tracking-widest">LIVE AUCTION</span>
                  </motion.div>
                )}
                {isEnded && (
                  <span className="bg-cyber-yellow text-black font-mono text-xs font-bold px-3 py-1.5">
                    🏁 AUCTION ENDED
                  </span>
                )}
              </div>

              {/* BidPulse badge */}
              {bidPulseActive && isActive && (
                <motion.div className="absolute top-3 right-3"
                  animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <span className="bg-cyber-purple text-white font-mono text-xs font-bold px-3 py-1.5">
                    ⚡ BIDPULSE ON
                  </span>
                </motion.div>
              )}

              {/* Leading banner */}
              {isLeading && isActive && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 py-2 text-center"
                  style={{ background: 'linear-gradient(transparent, rgba(0,255,136,0.3))' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <span className="font-display text-xl text-cyber-green tracking-widest">
                    ✓ YOU ARE CURRENTLY WINNING
                  </span>
                </motion.div>
              )}
            </div>

            {/* ── TITLE + DESCRIPTION ─────────────────────── */}
            <div>
              <h1 className="font-display text-4xl lg:text-5xl text-white tracking-wider leading-tight mb-3">
                {auction.title.toUpperCase()}
              </h1>
              <p className="font-mono text-sm text-gray-400 leading-relaxed">
                {auction.description}
              </p>
            </div>

            {/* ── STATS ROW ───────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'TOTAL BIDS',   value: auction.totalBids,                           color: 'text-cyber-cyan'   },
                { label: 'START PRICE',  value: `₹${auction.startPrice.toLocaleString('en-IN')}`, color: 'text-gray-400'     },
                { label: 'INCREMENT',    value: `+${auction.bidIncrement.toLocaleString('en-IN')}`, color: 'text-cyber-green'  },
              ].map(s => (
                <div key={s.label} className="neo-card border-cyber-border p-4">
                  <div className="font-mono text-xs text-gray-500 mb-1">{s.label}</div>
                  <div className={`font-display text-2xl ${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* ── LIVE BID FEED ────────────────────────────── */}
            <LiveBidFeed auctionId={id} socket={socket} initialBids={bids} />

            {/* ── ENDED — WINNER CARD ─────────────────────── */}
            <AnimatePresence>
              {isEnded && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="neo-card-yellow p-8 text-center holo-shimmer"
                  style={{ boxShadow: '6px 6px 0 #f5ff00' }}
                >
                  <div className="text-6xl mb-3">🏆</div>
                  <div className="font-display text-5xl text-cyber-yellow mb-4">AUCTION ENDED</div>
                  {auction.winner ? (
                    <>
                      <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">WINNER</div>
                      <div className="font-display text-4xl text-white mb-2">{auction.winner?.name}</div>
                      <div className="font-display text-3xl text-cyber-yellow">
                        ₹{auction.winningBid?.toLocaleString('en-IN')} CR
                      </div>
                      {auction.winner?._id === user?._id && (
                        <motion.div className="mt-4 font-display text-2xl text-cyber-green"
                          animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                          🎉 THIS IS YOU! CONGRATULATIONS!
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="font-mono text-gray-500">No winner — reserve price not met</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ══════════════════════════════════════════════════
              RIGHT COL (2) — Bid Panel
          ══════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── CURRENT PRICE CARD ──────────────────────── */}
            <motion.div
              className="neo-card p-6 relative overflow-hidden"
              style={{
                borderColor: priceFlash === 'up' ? '#00ff88'
                  : priceFlash === 'outbid'      ? '#ff2d55'
                  : isLeading                    ? '#00f5ff'
                  : '#2a2a2a',
                boxShadow: priceFlash === 'up'     ? '0 0 30px rgba(0,255,136,0.4), 4px 4px 0 #00ff88'
                  : priceFlash === 'outbid'        ? '0 0 30px rgba(255,45,85,0.4), 4px 4px 0 #ff2d55'
                  : isLeading                      ? '4px 4px 0 #00f5ff'
                  : '4px 4px 0 #2a2a2a',
                transition: 'all 0.3s',
              }}
            >
              {/* Flash overlay */}
              <AnimatePresence>
                {priceFlash && (
                  <motion.div
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: priceFlash === 'up'
                        ? 'rgba(0,255,136,0.12)'
                        : 'rgba(255,45,85,0.15)',
                    }}
                  />
                )}
              </AnimatePresence>

              <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-2">
                {isLeading ? '✓ YOU ARE LEADING' : isEnded ? 'FINAL PRICE' : 'CURRENT HIGHEST BID'}
              </div>

              {/* Animated price number */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPrice}
                  initial={{ y: -20, opacity: 0, scale: 1.1 }}
                  animate={{ y: 0,   opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="font-display leading-none mb-1"
                  style={{
                    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                    color: priceFlash === 'up'    ? '#00ff88'
                      : priceFlash === 'outbid' ? '#ff2d55'
                      : isLeading               ? '#00f5ff'
                      : '#e8e8e8',
                    transition: 'color 0.4s',
                  }}
                >
                  ₹{currentPrice.toLocaleString('en-IN')}
                  <span className="text-xl text-gray-500 ml-2">CR</span>
                </motion.div>
              </AnimatePresence>

              {auction.currentWinner?.name && !isEnded && (
                <div className="font-mono text-xs text-gray-500 mt-1">
                  Leading: <span className={isLeading ? 'text-cyber-cyan' : 'text-gray-300'}>
                    {isLeading ? 'YOU' : auction.currentWinner.name}
                  </span>
                </div>
              )}

              {/* Price progress bar vs user credits */}
              {isActive && (
                <div className="mt-4">
                  <div className="flex justify-between font-mono text-xs text-gray-600 mb-1">
                    <span>Price vs your credits</span>
                    <span>{Math.round(bidPct)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-cyber-border">
                    <motion.div
                      className="h-full"
                      style={{
                        background: bidPct > 80 ? '#ff2d55' : bidPct > 50 ? '#f5ff00' : '#00ff88',
                        transition: 'background 0.5s',
                      }}
                      animate={{ width: `${bidPct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* ── COUNTDOWN TIMER ─────────────────────────── */}
            {isActive && (
              <div className="neo-card border-cyber-purple p-5 text-center"
                style={{ boxShadow: '4px 4px 0 #bf00ff' }}>
                <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">
                  ⏱ TIME REMAINING
                </div>
                <CountdownTimer endTime={auction.endTime} large />
              </div>
            )}

            {/* ── YOUR CREDITS ────────────────────────────── */}
            {isActive && (
              <div className="neo-card-yellow p-4 flex items-center justify-between"
                style={{ boxShadow: '3px 3px 0 #f5ff00' }}>
                <div>
                  <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-0.5">
                    YOUR WALLET
                  </div>
                  <div className="font-display text-3xl text-cyber-yellow">
                    ₹{userCredits.toLocaleString('en-IN')}
                    <span className="text-base text-gray-500 ml-1">CR</span>
                  </div>
                </div>
                {isLeading && (
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="border-2 border-cyber-green px-3 py-2 text-center"
                    style={{ boxShadow: '0 0 12px rgba(0,255,136,0.4)' }}
                  >
                    <div className="font-mono text-xs text-cyber-green font-bold">LEADING</div>
                    <div className="font-mono text-xs text-cyber-green">✓</div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════
                BID FORM
            ══════════════════════════════════════════════ */}
            {isActive && (
              <motion.div
                className="neo-card p-5 space-y-4"
                style={{
                  borderColor: bidSuccess ? '#00ff88' : '#00f5ff',
                  boxShadow: bidSuccess
                    ? '0 0 30px rgba(0,255,136,0.5), 4px 4px 0 #00ff88'
                    : '4px 4px 0 #00f5ff',
                  transition: 'all 0.4s',
                }}
              >
                <div className="font-display text-2xl text-white tracking-wider">PLACE YOUR BID</div>

                {/* Quick bid buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {[0, auction.bidIncrement * 2, auction.bidIncrement * 5].map((extra, i) => (
                    <button key={i}
                      type="button"
                      onClick={() => quickBid(extra)}
                      className="font-mono text-xs border border-cyber-border py-2 hover:border-cyber-cyan hover:text-cyber-cyan transition-colors"
                    >
                      {i === 0 ? 'MIN' : `+${(extra).toLocaleString('en-IN')}`}
                      <div className="text-gray-600 text-xs">
                        ₹{(minBid + extra).toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Bid input */}
                <form onSubmit={handlePlaceBid} className="space-y-3">
                  <div>
                    <label className="neo-label">YOUR BID AMOUNT (CR)</label>
                    <input
                      ref={bidInputRef}
                      type="number"
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      placeholder={`Min: ${minBid}`}
                      min={minBid}
                      className="neo-input text-lg font-display"
                      style={{ fontSize: 20 }}
                    />
                    {/* After-bid credits preview */}
                    {bidAmount && Number(bidAmount) > 0 && (
                      <div className={`font-mono text-xs mt-1.5 ${creditsAfterBid < 0 ? 'text-cyber-red' : 'text-gray-500'}`}>
                        After bid: ₹{Math.max(0, creditsAfterBid).toLocaleString('en-IN')} CR remaining
                        {creditsAfterBid < 0 && ' ← INSUFFICIENT!'}
                      </div>
                    )}
                  </div>

                  {/* BID BUTTON — the hero element */}
                  <motion.button
                    type="submit"
                    disabled={placing || isLeading || !bidAmount || Number(bidAmount) < minBid || creditsAfterBid < 0}
                    className="w-full py-4 font-display text-2xl tracking-widest relative overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: isLeading ? '#0d2a1a' : placing ? '#0a1a2a' : '#00f5ff',
                      color: isLeading ? '#00ff88' : placing ? '#00f5ff' : '#000',
                      border: isLeading ? '2px solid #00ff88' : '2px solid #00f5ff',
                      boxShadow: isLeading ? '4px 4px 0 #00ff88' : placing ? 'none' : '6px 6px 0 rgba(0,245,255,0.5)',
                      transition: 'all 0.2s',
                    }}
                    whileTap={!isLeading && !placing ? { scale: 0.97, y: 2 } : {}}
                    whileHover={!isLeading && !placing ? { y: -2, boxShadow: '8px 8px 0 rgba(0,245,255,0.6)' } : {}}
                  >
                    {/* Shimmer on hover */}
                    <motion.div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)',
                        transform: 'translateX(-100%)',
                      }}
                      whileHover={{ transform: 'translateX(100%)' }}
                      transition={{ duration: 0.5 }}
                    />

                    {placing ? (
                      <span className="flex items-center justify-center gap-3">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          style={{ display: 'inline-block' }}
                        >⟳</motion.span>
                        PLACING BID...
                      </span>
                    ) : isLeading ? (
                      '✓ YOU ARE WINNING'
                    ) : (
                      `⚡ BID ₹${bidAmount ? Number(bidAmount).toLocaleString('en-IN') : '---'} CR`
                    )}
                  </motion.button>
                </form>

                <div className="font-mono text-xs text-gray-600 text-center">
                  Min bid: ₹{minBid.toLocaleString('en-IN')} CR
                  &nbsp;·&nbsp; Increment: +{auction.bidIncrement.toLocaleString('en-IN')} CR
                </div>
              </motion.div>
            )}

            {/* ── BIDPULSE BUTTON ──────────────────────────── */}
            {isActive && (
              <motion.button
                onClick={() => setShowBidPulse(true)}
                className="w-full py-4 relative overflow-hidden"
                style={{
                  background: bidPulseActive ? '#1a0a2a' : 'transparent',
                  border: `2px solid ${bidPulseActive ? '#bf00ff' : '#2a2a2a'}`,
                  boxShadow: bidPulseActive ? '4px 4px 0 #bf00ff, 0 0 20px rgba(191,0,255,0.3)' : 'none',
                  transition: 'all 0.3s',
                }}
                whileHover={{ borderColor: '#bf00ff', boxShadow: '4px 4px 0 #bf00ff' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-3">
                  <motion.span className="text-2xl"
                    animate={bidPulseActive ? { rotate: [0, 15, -15, 0] } : { scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}>
                    ⚡
                  </motion.span>
                  <div className="text-left">
                    <div className="font-display text-lg tracking-wider"
                      style={{ color: bidPulseActive ? '#bf00ff' : '#e8e8e8' }}>
                      {bidPulseActive ? 'BIDPULSE ACTIVE' : 'ACTIVATE BIDPULSE'}
                    </div>
                    <div className="font-mono text-xs text-gray-500">
                      {bidPulseActive ? 'Auto-bidding on your behalf' : 'Set max budget — AI bids for you'}
                    </div>
                  </div>
                  {bidPulseActive && (
                    <motion.div className="ml-auto w-3 h-3 rounded-full bg-cyber-purple"
                      animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
                  )}
                </div>
              </motion.button>
            )}

            {/* ── STREAK TRACKER ──────────────────────────── */}
            {isActive && streak > 0 && (
              <motion.div
                className="neo-card border-cyber-border p-4"
                animate={streakFlash ? { borderColor: '#bf00ff', boxShadow: '0 0 20px rgba(191,0,255,0.5)' } : {}}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <motion.span className="text-xl"
                      animate={streakFlash ? { scale: [1, 1.5, 1], rotate: [0, 20, -20, 0] } : {}}>
                      🔥
                    </motion.span>
                    <span className="font-mono text-xs text-gray-400 uppercase tracking-widest">
                      BIDPULSE STREAK
                    </span>
                  </div>
                  <span className="font-mono text-xs text-gray-600">
                    {streakProgress}/5 for BidCoin bonus
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div key={i}
                      className="flex-1 h-2"
                      style={{
                        background: i < streakProgress ? '#bf00ff' : '#2a2a2a',
                        boxShadow: i < streakProgress ? '0 0 6px #bf00ff' : 'none',
                      }}
                      animate={i < streakProgress ? { opacity: [0.7, 1, 0.7] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
                {streakFlash && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-xs text-cyber-purple mt-2 text-center"
                  >
                    🎉 STREAK MILESTONE! +50 BidCoins earned!
                  </motion.div>
                )}
              </motion.div>
            )}

          </div>
        </div>
      </div>

      {/* ── MODALS & OVERLAYS ──────────────────────────────── */}

      {/* BidPulse setup modal */}
      {showBidPulse && (
        <BidPulseModal
          auction={{ ...auction, currentPrice }}
          userCredits={userCredits}
          isActive={bidPulseActive}
          onClose={() => setShowBidPulse(false)}
          onCancel={() => { setBidPulseActive(false); setShowBidPulse(false) }}
          onActivate={() => { setBidPulseActive(true); setShowBidPulse(false) }}
        />
      )}

      {/* BidBot Gemini AI robot */}
      {isActive && (
        <BidBot
          auction={auction}
          currentPrice={currentPrice}
          isLeading={isLeading}
          userCredits={userCredits}
          totalBids={auction?.totalBids || 0}
        />
      )}

      {/* Winner dramatic popup */}
      {winnerPopup && (
        <WinnerPopup
          winner={winnerPopup.winner}
          winningBid={winnerPopup.winningBid}
          auctionTitle={winnerPopup.auctionTitle}
          isMe={winnerPopup.isMe}
          onClose={() => setWinnerPopup(null)}
        />
      )}
    </div>
  )
}
