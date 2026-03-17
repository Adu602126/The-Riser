// pages/RegisterPage.jsx — The Riser (Futuristic Edition)
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import MatrixRain from '../components/common/MatrixRain'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [strength, setStrength] = useState(0)

  const calcStrength = (pw) => {
    let s = 0
    if (pw.length >= 6)  s++
    if (pw.length >= 10) s++
    if (/[A-Z]/.test(pw)) s++
    if (/[0-9]/.test(pw)) s++
    if (/[^A-Za-z0-9]/.test(pw)) s++
    setStrength(s)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passphrases do not match'); return }
    if (form.password.length < 6) { toast.error('Passphrase must be ≥ 6 characters'); return }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      navigate('/auctions')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const strengthColors = ['#2a2a2a', '#ff2d55', '#f5ff00', '#00f5ff', '#00ff88', '#bf00ff']
  const strengthLabels = ['', 'WEAK', 'LOW', 'MODERATE', 'STRONG', 'MAX']

  return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center px-4 py-8"
      style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Matrix rain — purple tint for register */}
      <MatrixRain opacity={0.22} color="#bf00ff" fontSize={14} speed={1.0} density={0.976} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 20%, #0a0a0a 100%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 2 }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="font-display text-5xl tracking-wider neon-purple">
            THE RISER
          </Link>
          <div className="font-mono text-xs text-gray-500 mt-1 uppercase tracking-widest">
            NEW OPERATOR REGISTRATION
          </div>
        </div>

        {/* Card */}
        <div className="neo-card-purple p-8 holo-shimmer" style={{ position: 'relative' }}>

          {/* Corner decorations */}
          {[
            { top: -1, left: -1, style: { borderTop: '3px solid #bf00ff', borderLeft: '3px solid #bf00ff' } },
            { top: -1, right: -1, style: { borderTop: '3px solid #bf00ff', borderRight: '3px solid #bf00ff' } },
            { bottom: -1, left: -1, style: { borderBottom: '3px solid #bf00ff', borderLeft: '3px solid #bf00ff' } },
            { bottom: -1, right: -1, style: { borderBottom: '3px solid #bf00ff', borderRight: '3px solid #bf00ff' } },
          ].map((corner, i) => (
            <div key={i} style={{
              position: 'absolute', width: 16, height: 16,
              top: corner.top, left: corner.left,
              bottom: corner.bottom, right: corner.right,
              ...corner.style,
            }} />
          ))}

          <div className="font-display text-2xl text-white mb-1 tracking-wider">REGISTER IDENTITY</div>
          <div className="font-mono text-xs text-gray-600 mb-5 uppercase tracking-widest">
            ● 1 Crore Credits Granted on Signup
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="neo-label">⌗ OPERATOR NAME</label>
              <input type="text" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="neo-input" placeholder="Your full name" required />
            </div>

            <div>
              <label className="neo-label">⌗ EMAIL ADDRESS</label>
              <input type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="neo-input" placeholder="operator@example.com" required />
            </div>

            <div>
              <label className="neo-label">⌗ PASSPHRASE</label>
              <input type="password" value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); calcStrength(e.target.value) }}
                className="neo-input" placeholder="Min 6 characters" required />
              {/* Strength meter */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3,
                        background: i <= strength ? strengthColors[strength] : '#2a2a2a',
                        transition: 'background 0.3s',
                      }} />
                    ))}
                  </div>
                  <div className="font-mono text-xs" style={{ color: strengthColors[strength] }}>
                    STRENGTH: {strengthLabels[strength]}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="neo-label">⌗ CONFIRM PASSPHRASE</label>
              <input type="password" value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className="neo-input" placeholder="Repeat passphrase" required />
              {/* Match indicator */}
              {form.confirmPassword && (
                <div className={`font-mono text-xs mt-1 ${
                  form.password === form.confirmPassword ? 'text-cyber-green' : 'text-cyber-red'
                }`}>
                  {form.password === form.confirmPassword ? '✓ MATCH' : '✗ MISMATCH'}
                </div>
              )}
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="btn-bidpulse w-full mt-2 disabled:opacity-40"
              whileTap={{ scale: 0.97 }}
            >
              {loading ? 'REGISTERING OPERATOR...' : 'CREATE ACCOUNT → JOIN THE RISER'}
            </motion.button>
          </form>

          <div className="mt-5 pt-5 border-t-2 border-cyber-border text-center">
            <span className="font-mono text-xs text-gray-500">ALREADY REGISTERED? </span>
            <Link to="/login" className="font-mono text-xs text-cyber-cyan hover:underline uppercase tracking-widest">
              SIGN IN
            </Link>
          </div>
        </div>

        <div className="mt-4 flex justify-between font-mono text-xs text-gray-700 px-1">
          <span>CODEBIDZ HACKATHON 2026</span>
          <span>TEAM THE RISER</span>
        </div>
      </motion.div>
    </div>
  )
}
