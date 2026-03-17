// components/common/WinnerPopup.jsx — The Riser
// Full-screen dramatic winner reveal — triggered when auction:won event fires
// Drop inside AuctionDetail.jsx
//
// WHERE: frontend/src/components/common/WinnerPopup.jsx

import { motion, AnimatePresence } from 'framer-motion'
import MatrixRain from './MatrixRain'

export default function WinnerPopup({ winner, winningBid, auctionTitle, isMe, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
        }}
        onClick={onClose}
      >
        {/* Matrix rain behind the popup */}
        <MatrixRain
          opacity={isMe ? 0.35 : 0.2}
          color={isMe ? '#00ff88' : '#00f5ff'}
          fontSize={16}
          speed={isMe ? 2 : 1}
          density={0.972}
        />

        <motion.div
          initial={{ scale: 0.5, y: 60 }}
          animate={{ scale: 1,   y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
          style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Trophy */}
          <motion.div
            className="text-8xl mb-4"
            animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            🏆
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display mb-2"
            style={{
              fontSize: 'clamp(3rem, 10vw, 7rem)',
              color: isMe ? '#00ff88' : '#00f5ff',
              textShadow: isMe
                ? '0 0 30px #00ff88, 0 0 60px #00ff8866'
                : '0 0 30px #00f5ff, 0 0 60px #00f5ff66',
              lineHeight: 1,
            }}
          >
            {isMe ? 'YOU WON!' : 'WINNER!'}
          </motion.div>

          {/* Winner name */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-display text-3xl text-white mb-1"
          >
            {winner?.name || 'Anonymous'}
          </motion.div>

          {/* Auction title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="font-mono text-sm text-gray-400 mb-3"
          >
            {auctionTitle}
          </motion.div>

          {/* Winning bid */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.55, type: 'spring' }}
            className="font-display text-5xl mb-6"
            style={{ color: '#f5ff00' }}
          >
            ₹{Number(winningBid).toLocaleString('en-IN')}
            <span className="text-2xl text-gray-400 ml-2">CR</span>
          </motion.div>

          {/* Confetti-style dots */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: 8, height: 8,
                borderRadius: '50%',
                background: ['#00f5ff','#bf00ff','#f5ff00','#00ff88'][i % 4],
                top: '50%', left: '50%',
              }}
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * (120 + Math.random() * 80),
                y: Math.sin((i / 12) * Math.PI * 2) * (120 + Math.random() * 80),
                opacity: [1, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{ duration: 1.2, delay: 0.3 + i * 0.05 }}
            />
          ))}

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={onClose}
            className="font-mono text-xs text-gray-500 border border-cyber-border px-6 py-2 hover:text-white hover:border-gray-400 transition-colors"
          >
            CLOSE
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
