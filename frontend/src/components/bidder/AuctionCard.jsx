// components/bidder/AuctionCard.jsx — The Riser
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import CountdownTimer from '../common/CountdownTimer'

// ── Per-status visual theme ───────────────────────────────────
const THEME = {
  active: {
    border:  'border-cyber-cyan',
    shadow:  '4px 4px 0 #00f5ff',
    badge:   'badge-active',
    label:   '● LIVE',
    btnCls:  'border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-black',
    btnText: '⚡ BID NOW',
    priceColor: 'text-cyber-cyan',
  },
  upcoming: {
    border:  'border-cyber-yellow',
    shadow:  '4px 4px 0 #f5ff00',
    badge:   'badge-upcoming',
    label:   '◆ SOON',
    btnCls:  'border-cyber-yellow text-cyber-yellow hover:bg-cyber-yellow hover:text-black',
    btnText: '👁 WATCH',
    priceColor: 'text-cyber-yellow',
  },
  ended: {
    border:  'border-cyber-border',
    shadow:  '3px 3px 0 #2a2a2a',
    badge:   'badge-ended',
    label:   '■ ENDED',
    btnCls:  'border-cyber-border text-gray-600 hover:border-gray-500 hover:text-gray-400',
    btnText: 'VIEW RESULT',
    priceColor: 'text-gray-400',
  },
}

// Format ₹ with Indian locale (1,00,000 style)
const formatINR = (n) =>
  Number(n).toLocaleString('en-IN')

export default function AuctionCard({ auction, index = 0 }) {
  const status = auction.status || 'ended'
  const theme  = THEME[status] || THEME.ended

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ translateY: -4, translateX: -2 }}
      className={`neo-card ${theme.border} overflow-hidden flex flex-col group`}
      style={{ boxShadow: theme.shadow }}
    >
      {/* ── Image ─────────────────────────────────────────── */}
      <div className="relative aspect-video overflow-hidden bg-cyber-dark flex-shrink-0">
        <img
          src={auction.imageUrl}
          alt={auction.title}
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100
                     group-hover:scale-105 transition-all duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop&q=60'
          }}
        />

        {/* Status badge */}
        <div className="absolute top-2 left-2 flex gap-2 items-center">
          <span className={theme.badge}>{theme.label}</span>
        </div>

        {/* Live pulse dot (active only) */}
        {status === 'active' && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5">
            <span className="live-dot" />
            <span className="font-mono text-xs text-white">LIVE</span>
          </div>
        )}

        {/* Bid count badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5">
          <span className="font-mono text-xs text-gray-300">
            {auction.totalBids} BID{auction.totalBids !== 1 ? 'S' : ''}
          </span>
        </div>

        {/* Winner ribbon (ended) */}
        {status === 'ended' && auction.winner && (
          <div className="absolute bottom-2 left-2 bg-cyber-yellow/90 px-2 py-0.5">
            <span className="font-mono text-xs text-black font-bold">
              🏆 {auction.winner?.name || 'SOLD'}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1 gap-2">

        {/* Title */}
        <h3 className="font-display text-lg text-white line-clamp-1 tracking-wide leading-tight">
          {auction.title.toUpperCase()}
        </h3>

        {/* Description */}
        <p className="font-mono text-xs text-gray-500 line-clamp-2 flex-1 leading-relaxed">
          {auction.description}
        </p>

        {/* ── Price + Timer row ──────────────────────────── */}
        <div className="flex items-end justify-between border-t-2 border-cyber-border pt-3 mt-auto">
          {/* Price */}
          <div>
            <div className="font-mono text-xs text-gray-500 uppercase mb-0.5">
              {status === 'ended' ? 'Final Bid' : status === 'upcoming' ? 'Start Price' : 'Current Bid'}
            </div>
            <div className={`font-display text-2xl leading-none ${theme.priceColor}`}>
              {formatINR(auction.currentPrice)}
            </div>
            <div className="font-mono text-xs text-gray-600">credits</div>
          </div>

          {/* Right side — timer or winner */}
          <div className="text-right">
            {status === 'active' && (
              <>
                <div className="font-mono text-xs text-gray-500 mb-0.5">ENDS IN</div>
                <CountdownTimer endTime={auction.endTime} size="sm" />
              </>
            )}
            {status === 'upcoming' && (
              <>
                <div className="font-mono text-xs text-gray-500 mb-0.5">STARTS IN</div>
                <CountdownTimer endTime={auction.startTime} size="sm" />
              </>
            )}
            {status === 'ended' && (
              <>
                <div className="font-mono text-xs text-gray-500 mb-0.5">CLOSED</div>
                <div className="font-mono text-xs text-gray-600">
                  {new Date(auction.endTime).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short',
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── CTA Button ────────────────────────────────── */}
        <Link
          to={`/auctions/${auction._id}`}
          className={`mt-1 text-center font-mono text-xs uppercase tracking-widest
            py-2.5 border-2 transition-all duration-150 block ${theme.btnCls}`}
        >
          {theme.btnText}
        </Link>
      </div>
    </motion.div>
  )
}
