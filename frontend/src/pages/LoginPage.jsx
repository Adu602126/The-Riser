// pages/LoginPage.jsx — The Riser (Futuristic Edition)
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import MatrixRain from '../components/common/MatrixRain'
import toast from 'react-hot-toast'

// Typing animation hook
function useTyping(text, speed = 60) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    let i = 0
    const iv = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [text])
  return displayed
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [glitch, setGlitch]   = useState(false)

  const typed = useTyping('IDENTITY VERIFICATION REQUIRED...', 50)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setGlitch(true)
    setTimeout(() => setGlitch(false), 600)
    try {
      const user = await login(form.email, form.password)
      navigate(user.role === 'admin' ? '/admin' : '/auctions')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Access denied')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center px-4"
      style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Full-page Matrix rain — stronger on login */}
      <MatrixRain opacity={0.28} color="#00f5ff" fontSize={14} speed={1.1} density={0.975} />

      {/* Vignette overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 30%, #0a0a0a 100%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 2 }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo + typing text */}
        <div className="text-center mb-8">
          <motion.div
            className={`font-display text-5xl tracking-wider mb-2 ${glitch ? 'glitch-text' : ''}`}
            data-text="THE RISER"
            style={{ color: '#00f5ff' }}
            animate={glitch ? { x: [-2, 2, -1, 1, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            THE RISER
          </motion.div>
          <div className="font-mono text-xs text-gray-500 tracking-widest cursor-blink">
            {typed}
          </div>
        </div>

        {/* Form card */}
        <div className="neo-card-cyan p-8 holo-shimmer" style={{ backdropFilter: 'blur(2px)' }}>

          {/* Corner decorations */}
          <div style={{
            position: 'absolute', top: -1, left: -1,
            width: 16, height: 16,
            borderTop: '3px solid #00f5ff',
            borderLeft: '3px solid #00f5ff',
          }} />
          <div style={{
            position: 'absolute', top: -1, right: -1,
            width: 16, height: 16,
            borderTop: '3px solid #00f5ff',
            borderRight: '3px solid #00f5ff',
          }} />
          <div style={{
            position: 'absolute', bottom: -1, left: -1,
            width: 16, height: 16,
            borderBottom: '3px solid #00f5ff',
            borderLeft: '3px solid #00f5ff',
          }} />
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 16, height: 16,
            borderBottom: '3px solid #00f5ff',
            borderRight: '3px solid #00f5ff',
          }} />

          <div className="font-display text-2xl text-white mb-1 tracking-wider">ACCESS TERMINAL</div>
          <div className="font-mono text-xs text-gray-600 mb-6 uppercase tracking-widest">
            ● System Online &nbsp;|&nbsp; Encryption Active
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="neo-label">⌗ IDENTIFIER (EMAIL)</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="neo-input"
                placeholder="operator@theriser.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="neo-label">⌗ PASSPHRASE</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="neo-input"
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-cyber-cyan w-full mt-4 disabled:opacity-40 relative overflow-hidden"
              whileTap={{ scale: 0.97 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="font-mono text-sm">AUTHENTICATING</span>
                  <span className="cyber-progress w-12 inline-block" />
                </span>
              ) : (
                'LOGIN → ENTER SYSTEM'
              )}
              {/* Shimmer on hover */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                transform: 'translateX(-100%)',
                transition: 'transform 0.4s',
              }} className="btn-shimmer" />
            </motion.button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-cyber-border">
            <div className="text-center font-mono text-xs text-gray-500 mb-3">
              NO CLEARANCE?{' '}
              <Link to="/register" className="text-cyber-cyan hover:underline uppercase tracking-widest">
                REQUEST ACCESS
              </Link>
            </div>

            {/* Demo credentials */}
            <div className="bg-cyber-darker border border-cyber-border p-3 space-y-1"
              style={{ background: '#111' }}>
              <div className="font-mono text-xs text-gray-600 uppercase tracking-widest mb-1">
                ▸ Demo Credentials
              </div>
              <div className="font-mono text-xs">
                <span className="text-gray-600">Admin  → </span>
                <span className="text-cyber-yellow">admin@theriser.com / admin123</span>
              </div>
              <div className="font-mono text-xs">
                <span className="text-gray-600">Bidder → </span>
                <span className="text-cyber-green">aditya@theriser.com / bidder123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom system info */}
        <div className="mt-4 flex justify-between font-mono text-xs text-gray-700 px-1">
          <span>v1.0.0 — CODEBIDZ 2026</span>
          <span>THE RISER © TEAM</span>
        </div>
      </motion.div>
    </div>
  )
}
