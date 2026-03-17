// components/common/CountdownTimer.jsx — The Riser (Futuristic Edition)
import { useCountdown } from '../../hooks/useCountdown'
import { motion, AnimatePresence } from 'framer-motion'

export default function CountdownTimer({ endTime, size = 'md', large = false }) {
  const { days, hours, minutes, seconds, isExpired, isUrgent } = useCountdown(endTime)

  // Format as HH:MM:SS string for small/md
  const pad    = (n) => String(n).padStart(2, '0')
  const timeStr = days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`

  if (isExpired) {
    return (
      <span className="font-mono text-gray-500 text-xs uppercase tracking-widest">
        CLOSED
      </span>
    )
  }

  // Large countdown — for AuctionDetail sidebar
  if (large || size === 'lg') {
    return (
      <div className="flex items-center gap-2 justify-center">
        {days > 0 && <TimeBlock value={days}    label="DAYS" urgent={isUrgent} />}
        <TimeBlock value={hours}   label="HRS"  urgent={isUrgent} />
        <Sep urgent={isUrgent} />
        <TimeBlock value={minutes} label="MIN"  urgent={isUrgent} />
        <Sep urgent={isUrgent} />
        <TimeBlock value={seconds} label="SEC"  urgent={isUrgent} animate />
      </div>
    )
  }

  // Small inline timer (used in AuctionCard)
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={seconds}
        initial={{ opacity: 0.6, y: -2 }}
        animate={{ opacity: 1,   y: 0 }}
        className={`font-mono font-bold tracking-widest tabular-nums ${
          isUrgent
            ? 'text-cyber-red text-sm animate-pulse'
            : 'text-cyber-cyan text-sm'
        }`}
      >
        {isUrgent && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="mr-1"
          >
            ⚠
          </motion.span>
        )}
        {timeStr}
      </motion.span>
    </AnimatePresence>
  )
}

// ── Individual time block (for large mode) ────────────────────
function TimeBlock({ value, label, urgent, animate = false }) {
  const color  = urgent ? '#ff2d55' : '#00f5ff'
  const shadow = urgent ? '3px 3px 0 #ff2d55' : '3px 3px 0 #00f5ff'

  return (
    <motion.div
      className="flex flex-col items-center neo-card px-3 py-2 min-w-[58px]"
      style={{
        borderColor: color,
        boxShadow:   shadow,
      }}
      animate={urgent && animate ? {
        borderColor: ['#ff2d55', '#ff2d5555', '#ff2d55'],
        scale: [1, 1.04, 1],
      } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      {/* Glitch number when urgent */}
      <motion.span
        key={value}
        className="font-display text-3xl leading-none tabular-nums"
        style={{ color }}
        initial={{ y: -4, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {urgent ? (
          <span
            className="glitch-text"
            data-text={String(value).padStart(2, '0')}
          >
            {String(value).padStart(2, '0')}
          </span>
        ) : (
          String(value).padStart(2, '0')
        )}
      </motion.span>
      <span className="font-mono text-xs text-gray-500 mt-0.5">{label}</span>
    </motion.div>
  )
}

// ── Colon separator ───────────────────────────────────────────
function Sep({ urgent }) {
  return (
    <motion.span
      className="font-display text-2xl pb-3"
      style={{ color: urgent ? '#ff2d55' : '#00f5ff' }}
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      :
    </motion.span>
  )
}
