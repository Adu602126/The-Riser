// components/common/BidBot.jsx — The Riser
// Gemini-powered floating auction robot with live commentary
// API Key: hardcoded for demo (AIzaSyCpwx26colhzFeBw2vQacvZpRiMn1vvDGA)

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Gemini API key — hardcoded for demo ──────────────────────
const GEMINI_KEY = 'AIzaSyCpwx26colhzFeBw2vQacvZpRiMn1vvDGA'

// ── Gemini API call ───────────────────────────────────────────
async function askGemini(prompt) {
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const token   = localStorage.getItem('riser_token')
    const res = await fetch(`${apiBase}/gemini/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.text || null
  } catch {
    return null
  }
}

// ── Fallback messages (used when Gemini is rate-limited) ─────
const FALLBACKS = {
  idle: [
    '👀 Watching this auction closely for you...',
    '📊 Analyzing bid patterns right now!',
    '⚡ Ready to help your bidding strategy!',
    '🔍 Keeping an eye on the competition!',
  ],
  newBid: [
    '🔥 Someone just bid! Price is heating up!',
    '⚡ New bid landed! Stay sharp!',
    '💥 Competition is getting fierce!',
    '🚨 Price just jumped — your move!',
  ],
  leading: [
    '✅ YOU are leading! Hold that position!',
    '🏆 You\'re on top! Don\'t let them steal it!',
    '💪 WINNING! Stay strong and watch the timer!',
  ],
  outbid: [
    '⚠️ You got OUTBID! Counter-attack NOW!',
    '😤 Someone stole your lead — BID BACK!',
    '🚨 OUTBID! Don\'t let them win this easily!',
  ],
  urgentTimer: [
    '⏰ LAST MINUTES! BID NOW or lose it!',
    '🔴 TIME IS RUNNING OUT! Final chance!',
    '⚡ HURRY! Auction ending VERY SOON!',
  ],
  winning: [
    '🎉 YOU WON THIS AUCTION! Incredible!',
    '🏆 VICTORY! The item is YOURS!',
    '🥳 CHAMPION MOVE! Amazing strategy!',
  ],
  expensive: [
    '💸 Price is getting HIGH. Watch your credits!',
    '📈 This item is hotly contested — be careful!',
    '🤔 Consider your max budget carefully here!',
  ],
}

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── Robot SVG faces ───────────────────────────────────────────
const FACES = {
  idle: (color) => (
    <g>
      <rect x="8"  y="10" width="8"  height="8" rx="2" fill={color} opacity="0.9"/>
      <rect x="24" y="10" width="8"  height="8" rx="2" fill={color} opacity="0.9"/>
      <rect x="12" y="22" width="16" height="3"  rx="1" fill={color} opacity="0.6"/>
    </g>
  ),
  excited: (color) => (
    <g>
      <rect x="6"  y="8"  width="10" height="10" rx="2" fill={color}/>
      <rect x="24" y="8"  width="10" height="10" rx="2" fill={color}/>
      <path d="M10 22 Q20 30 30 22" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  ),
  worried: (color) => (
    <g>
      <rect x="8"  y="11" width="8" height="5" rx="1" fill={color}/>
      <rect x="24" y="11" width="8" height="5" rx="1" fill={color}/>
      <path d="M10 26 Q20 20 30 26" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  ),
  celebrating: (color) => (
    <g>
      <text x="7"  y="20" fontSize="12" fill={color}>★</text>
      <text x="24" y="20" fontSize="12" fill={color}>★</text>
      <path d="M8 24 Q20 34 32 24" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  ),
  thinking: (color) => (
    <g>
      <rect x="8"  y="10" width="8" height="8" rx="2" fill={color}/>
      <rect x="24" y="12" width="8" height="4" rx="1" fill={color}/>
      <circle cx="20" cy="26" r="2" fill={color}/>
      <circle cx="26" cy="24" r="1.5" fill={color} opacity="0.6"/>
      <circle cx="30" cy="21" r="1"   fill={color} opacity="0.3"/>
    </g>
  ),
}

const THEME = {
  idle:        { body: '#1a1a1a', border: '#2a2a2a', face: '#00f5ff' },
  excited:     { body: '#0d2a1a', border: '#00ff88', face: '#00ff88' },
  worried:     { body: '#2a2a0a', border: '#f5ff00', face: '#f5ff00' },
  celebrating: { body: '#1a1a00', border: '#f5ff00', face: '#f5ff00' },
  thinking:    { body: '#1a0a2a', border: '#bf00ff', face: '#bf00ff' },
}

// ─────────────────────────────────────────────────────────────

export default function BidBot({
  auction,
  currentPrice = 0,
  isLeading    = false,
  userCredits  = 0,
  totalBids    = 0,
}) {
  const [open, setOpen]         = useState(false)
  const [face, setFace]         = useState('idle')
  const [message, setMessage]   = useState('👋 Hi! I\'m BidBot — your Gemini AI auction assistant! Click me for live tips!')
  const [loading, setLoading]   = useState(false)
  const [blinking, setBlinking] = useState(false)
  const [bounce, setBounce]     = useState(false)

  const prevPrice   = useRef(currentPrice)
  const prevLeading = useRef(isLeading)
  const prevBids    = useRef(totalBids)
  const cooldown    = useRef(false)

  const theme = THEME[face]

  // ── Blink animation ───────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setBlinking(true)
      setTimeout(() => setBlinking(false), 150)
    }, 3500)
    return () => clearInterval(iv)
  }, [])

  // ── Bounce on new event ───────────────────────────────────
  const triggerBounce = () => {
    setBounce(true)
    setTimeout(() => setBounce(false), 600)
  }

  // ── Speak — calls Gemini then fallback ────────────────────
  const speak = useCallback(async (type, context = '') => {
    setLoading(true)
    triggerBounce()
    if (!open) setOpen(true)

    let msg = null

    // Gemini — rate-limited to once per 7s
    if (!cooldown.current) {
      cooldown.current = true
      setTimeout(() => { cooldown.current = false }, 7000)
      msg = await askGemini(context)
    }

    // Fallback
    if (!msg) msg = getRandom(FALLBACKS[type] || FALLBACKS.idle)

    setMessage(msg)
    setLoading(false)
  }, [open])

  // ── React to bid changes ──────────────────────────────────
  useEffect(() => {
    if (!auction) return

    // New bid detected
    if (totalBids > prevBids.current) {
      prevBids.current = totalBids

      if (isLeading) {
        setFace('excited')
        speak('leading',
          `User is WINNING the auction for "${auction.title}". ` +
          `Current price: ₹${currentPrice.toLocaleString('en-IN')}. ` +
          `Total bids: ${totalBids}. Encourage them to hold their lead!`
        )
      } else {
        setFace('worried')
        speak('newBid',
          `Someone placed a new bid on "${auction.title}". ` +
          `Price raised to ₹${currentPrice.toLocaleString('en-IN')}. ` +
          `User is NOT leading. Urge them to bid back quickly!`
        )
      }
    }

    // Just got outbid
    if (prevLeading.current && !isLeading && prevBids.current > 0) {
      setFace('worried')
      speak('outbid',
        `User just got OUTBID on "${auction.title}"! ` +
        `Current price now ₹${currentPrice.toLocaleString('en-IN')}. ` +
        `Tell them to place a counter-bid immediately!`
      )
    }

    prevPrice.current   = currentPrice
    prevLeading.current = isLeading
  }, [currentPrice, isLeading, totalBids, auction])

  // ── Credits running low warning ───────────────────────────
  useEffect(() => {
    if (!auction || !userCredits || currentPrice === 0) return
    const ratio = currentPrice / userCredits
    if (ratio > 0.6 && ratio < 0.85) {
      setFace('thinking')
    } else if (ratio >= 0.85) {
      setFace('worried')
      speak('expensive',
        `Price ₹${currentPrice.toLocaleString('en-IN')} is ` +
        `${Math.round(ratio * 100)}% of user's total credits ₹${userCredits.toLocaleString('en-IN')}. ` +
        `Warn them about budget risk on "${auction.title}".`
      )
    }
  }, [currentPrice, userCredits])

  // ── Idle tips every 30s ───────────────────────────────────
  useEffect(() => {
    if (!auction) return
    const iv = setInterval(() => {
      if (open && face === 'idle') {
        setFace('thinking')
        speak('idle',
          `Give a strategic bidding tip for "${auction.title}". ` +
          `Current price: ₹${currentPrice.toLocaleString('en-IN')}. ` +
          `User credits: ₹${userCredits.toLocaleString('en-IN')}. ` +
          `Is leading: ${isLeading}. Keep it short and actionable!`
        )
        setTimeout(() => setFace('idle'), 5000)
      }
    }, 30000)
    return () => clearInterval(iv)
  }, [face, open, currentPrice, auction, userCredits, isLeading])

  // ── Manual advice ─────────────────────────────────────────
  const handleAsk = useCallback(() => {
    setFace('thinking')
    speak('idle',
      `User clicked BidBot for advice on "${auction?.title}". ` +
      `Price: ₹${currentPrice.toLocaleString('en-IN')}. ` +
      `Their credits: ₹${userCredits.toLocaleString('en-IN')}. ` +
      `Leading: ${isLeading}. Total bids: ${totalBids}. ` +
      `Give them 1 smart strategic tip right now!`
    )
    setTimeout(() => setFace(isLeading ? 'excited' : 'idle'), 4000)
  }, [auction, currentPrice, userCredits, isLeading, totalBids])

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      zIndex: 1000,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
      pointerEvents: 'none',
    }}>

      {/* ── Speech Bubble ──────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            style={{
              pointerEvents: 'auto',
              maxWidth: 270,
              background: theme.body,
              border: `2px solid ${theme.border}`,
              boxShadow: `4px 4px 0 ${theme.border}`,
              padding: '12px 14px',
              position: 'relative',
            }}
          >
            {/* Bubble tail arrow */}
            <div style={{
              position: 'absolute', bottom: -10, right: 26,
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `10px solid ${theme.border}`,
            }} />

            {/* Header row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 8,
            }}>
              <span style={{
                fontFamily: 'DM Mono, monospace', fontSize: 10,
                color: theme.border, textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                ⚡ BIDBOT · GEMINI AI
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  color: '#555', background: 'none', border: 'none',
                  fontSize: 14, lineHeight: 1, cursor: 'none',
                }}
              >✕</button>
            </div>

            {/* Message / Loading dots */}
            {loading ? (
              <div style={{ display: 'flex', gap: 5, padding: '6px 0', alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>
                  Gemini thinking
                </span>
                {[0,1,2].map(i => (
                  <motion.div key={i}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: theme.border }}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12 }}
                  />
                ))}
              </div>
            ) : (
              <p style={{
                fontFamily: 'DM Mono, monospace', fontSize: 12,
                color: '#e8e8e8', lineHeight: 1.55, margin: 0,
              }}>
                {message}
              </p>
            )}

            {/* Ask button */}
            <button
              onClick={handleAsk}
              style={{
                display: 'block', width: '100%', marginTop: 10,
                fontFamily: 'DM Mono, monospace', fontSize: 10,
                color: theme.border, border: `1px solid ${theme.border}`,
                background: 'transparent', padding: '5px 10px',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                cursor: 'none', textAlign: 'center',
              }}
            >
              ASK FOR STRATEGY ADVICE →
            </button>

            {/* Gemini branding */}
            <div style={{
              marginTop: 6, textAlign: 'center',
              fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#333',
            }}>
              powered by Google Gemini 2.0 Flash
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Robot SVG ──────────────────────────────────────── */}
      <motion.div
        style={{ pointerEvents: 'auto', position: 'relative' }}
        animate={bounce
          ? { y: [0, -18, 0, -8, 0], rotate: [0, -6, 6, -3, 0] }
          : { y: [0, -5, 0] }
        }
        transition={bounce
          ? { duration: 0.55, ease: 'easeOut' }
          : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
        }
        onClick={() => {
          if (!open) { setOpen(true); handleAsk() }
          else setOpen(false)
        }}
        title="Click me for Gemini AI bidding advice!"
      >
        <svg
          width="68" height="84"
          viewBox="0 0 40 54"
          style={{
            filter: `drop-shadow(0 0 10px ${theme.border}99)`,
            cursor: 'none', display: 'block',
          }}
        >
          {/* Antenna */}
          <line x1="20" y1="0" x2="20" y2="7"
            stroke={theme.border} strokeWidth="2" strokeLinecap="round"/>
          <motion.circle cx="20" cy="3" r="3" fill={theme.border}
            animate={{ opacity: [1, 0.2, 1], r: [3, 4, 3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />

          {/* Head */}
          <rect x="4" y="7" width="32" height="28" rx="5"
            fill={theme.body} stroke={theme.border} strokeWidth="2"/>

          {/* Face */}
          {blinking ? (
            <g>
              <rect x="8"  y="15" width="8" height="2" rx="1" fill={theme.face} opacity="0.5"/>
              <rect x="24" y="15" width="8" height="2" rx="1" fill={theme.face} opacity="0.5"/>
              <rect x="12" y="22" width="16" height="3" rx="1" fill={theme.face} opacity="0.6"/>
            </g>
          ) : (
            FACES[face]?.(theme.face)
          )}

          {/* Screen glare */}
          <rect x="5" y="8" width="14" height="5" rx="2" fill="white" opacity="0.04"/>

          {/* Body */}
          <rect x="8" y="37" width="24" height="14" rx="4"
            fill={theme.body} stroke={theme.border} strokeWidth="1.5"/>

          {/* Chest panel buttons */}
          <circle cx="14" cy="44" r="2.5" fill={theme.face} opacity="0.8"/>
          <circle cx="20" cy="44" r="2.5" fill={theme.face} opacity="0.5"/>
          <circle cx="26" cy="44" r="2.5" fill={theme.face} opacity="0.3"/>

          {/* Body chest line */}
          <rect x="10" y="40" width="20" height="1.5" rx="0.5" fill={theme.face} opacity="0.15"/>

          {/* Arms */}
          <rect x="0"  y="38" width="6"  height="11" rx="3"
            fill={theme.body} stroke={theme.border} strokeWidth="1.5"/>
          <rect x="34" y="38" width="6"  height="11" rx="3"
            fill={theme.body} stroke={theme.border} strokeWidth="1.5"/>

          {/* Legs */}
          <rect x="11" y="51" width="7" height="5" rx="2"
            fill={theme.body} stroke={theme.border} strokeWidth="1.5"/>
          <rect x="22" y="51" width="7" height="5" rx="2"
            fill={theme.body} stroke={theme.border} strokeWidth="1.5"/>
        </svg>

        {/* Label */}
        <div style={{
          fontFamily: 'DM Mono, monospace', fontSize: 9,
          color: theme.border, textAlign: 'center',
          letterSpacing: '0.15em', marginTop: 2,
          textShadow: `0 0 8px ${theme.border}`,
        }}>
          BIDBOT AI
        </div>

        {/* Notification dot — pulsing when closed */}
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              position: 'absolute', top: 2, right: 2,
              width: 10, height: 10, borderRadius: '50%',
              background: '#ff2d55', border: '2px solid #0a0a0a',
            }}
          />
        )}
      </motion.div>
    </div>
  )
}
