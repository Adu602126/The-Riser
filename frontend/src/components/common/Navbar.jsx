// components/common/Navbar.jsx — The Riser (Winning Edition)
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { useState, useEffect } from 'react'
import { api } from '../../context/AuthContext'

export default function Navbar() {
  const { user, logout }   = useAuth()
  const { connected }      = useSocket()
  const navigate           = useNavigate()
  const location           = useLocation()
  const [credits, setCredits]     = useState(null)
  const [prevCredits, setPrev]    = useState(null)
  const [creditFlash, setFlash]   = useState(null) // 'up' | 'down' | null
  const [menuOpen, setMenuOpen]   = useState(false)
  const [pendingCount, setPending] = useState(0)
  const [scrolled, setScrolled]   = useState(false)

  // Track scroll for glass-morphism effect
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Fetch pending approvals count for admin
  useEffect(() => {
    if (user?.role !== 'admin') return
    api.get('/auctions/pending').then(({ data }) => setPending(data.count || 0))
  }, [user])

  // Fetch + live-refresh credit balance for bidders
  useEffect(() => {
    if (user?.role !== 'bidder') return
    const fetch = () =>
      api.get('/credits/balance').then(({ data }) => {
        setCredits(prev => {
          if (prev !== null && data.credits !== prev) {
            setFlash(data.credits > prev ? 'up' : 'down')
            setTimeout(() => setFlash(null), 1500)
          }
          setPrev(data.credits)
          return data.credits
        })
      })
    fetch()
    const iv = setInterval(fetch, 15000) // re-fetch every 15s
    return () => clearInterval(iv)
  }, [user])

  const handleLogout = () => { logout(); navigate('/') }
  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 border-b-2 border-cyber-border"
      style={{
        background: scrolled
          ? 'rgba(10,10,10,0.95)'
          : '#0a0a0a',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.3s',
      }}
    >
      {/* Top accent line — animated */}
      <motion.div
        style={{ height: 2 }}
        animate={{
          background: connected
            ? ['linear-gradient(90deg,#00f5ff,#bf00ff,#00f5ff)', 'linear-gradient(90deg,#bf00ff,#00f5ff,#bf00ff)']
            : 'linear-gradient(90deg,#2a2a2a,#2a2a2a)',
          backgroundSize: '200% 100%',
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">

        {/* ── Logo ─────────────────────────────────────────── */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.span
            className="font-display text-2xl tracking-wider"
            style={{ color: '#00f5ff' }}
            animate={{
              textShadow: [
                '0 0 8px #00f5ff44',
                '0 0 20px #00f5ffaa',
                '0 0 8px #00f5ff44',
              ],
            }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            THE RISER
          </motion.span>
          <span className="font-mono text-xs text-gray-700 hidden sm:inline group-hover:text-gray-500 transition-colors">
            AUCTION_v1.0
          </span>
        </Link>

        {/* ── Center nav links ──────────────────────────────── */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {user.role === 'admin' ? (
              <>
                <NavLink to="/admin"                  label="DASHBOARD"  active={isActive('/admin') && location.pathname === '/admin'} />
                <NavLink to="/admin/auctions/create"  label="+ AUCTION"  active={isActive('/admin/auctions/create')} />
                <NavLink to="/admin/credits"          label="CREDITS"    active={isActive('/admin/credits')} />
                <NavLinkBadge to="/admin/pending" label="APPROVALS" active={isActive('/admin/pending')} count={pendingCount} />
              </>
            ) : (
              <>
                <NavLink to="/auctions"  label="AUCTIONS"   active={isActive('/auctions')} />
                <NavLink to="/dashboard" label="DASHBOARD"  active={isActive('/dashboard')} />
                <NavLink to="/won"       label="WON ITEMS"  active={isActive('/won')} />
                <NavLink to="/submit-auction" label="+ SELL ITEM" active={isActive('/submit-auction')} />
                <NavLink to="/my-submissions" label="MY LISTINGS" active={isActive('/my-submissions')} />
              </>
            )}
          </div>
        )}

        {/* ── Right side ───────────────────────────────────── */}
        <div className="flex items-center gap-3">

          {/* Connection dot */}
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? '#00ff88' : '#ff2d55' }}
              animate={connected
                ? { boxShadow: ['0 0 4px #00ff88', '0 0 12px #00ff88', '0 0 4px #00ff88'] }
                : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="font-mono text-xs text-gray-600 hidden sm:inline">
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {user ? (
            <>
              {/* Credits badge — flashes on change */}
              {user.role === 'bidder' && credits !== null && (
                <motion.div
                  className="neo-card border-cyber-yellow hidden sm:flex items-center gap-1.5 px-3 py-1"
                  style={{
                    boxShadow: creditFlash === 'up'
                      ? '0 0 12px #00ff88, 2px 2px 0 #f5ff00'
                      : creditFlash === 'down'
                      ? '0 0 12px #ff2d55, 2px 2px 0 #f5ff00'
                      : '2px 2px 0 #f5ff00',
                    borderColor: creditFlash === 'up' ? '#00ff88' : creditFlash === 'down' ? '#ff2d55' : '#f5ff00',
                    transition: 'all 0.4s',
                  }}
                >
                  <span className="font-mono text-xs text-gray-500">₹</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={credits}
                      initial={{ y: creditFlash === 'up' ? -8 : creditFlash === 'down' ? 8 : 0, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-mono text-sm font-bold"
                      style={{
                        color: creditFlash === 'up' ? '#00ff88' : creditFlash === 'down' ? '#ff2d55' : '#f5ff00',
                      }}
                    >
                      {Number(credits).toLocaleString('en-IN')}
                    </motion.span>
                  </AnimatePresence>
                  <span className="font-mono text-xs text-gray-600">CR</span>
                </motion.div>
              )}

              {/* User chip */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 border-2 border-cyber-cyan flex items-center justify-center">
                  <span className="font-mono text-xs text-cyber-cyan font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-mono text-xs text-white leading-tight">{user.name.split(' ')[0]}</div>
                  <div className="font-mono text-xs text-gray-600 uppercase">{user.role}</div>
                </div>
              </div>

              {/* Logout */}
              <motion.button
                onClick={handleLogout}
                className="font-mono text-xs text-cyber-red border border-cyber-red px-3 py-1.5 transition-colors"
                whileHover={{ backgroundColor: '#ff2d55', color: '#000' }}
                whileTap={{ scale: 0.96 }}
              >
                EXIT
              </motion.button>

              {/* Mobile hamburger */}
              <button
                className="md:hidden font-mono text-xs text-gray-400 border border-cyber-border px-2 py-1"
                onClick={() => setMenuOpen(o => !o)}
              >
                {menuOpen ? '✕' : '☰'}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login"    className="btn-cyber-outline text-sm py-1.5 px-4">LOGIN</Link>
              <Link to="/register" className="btn-cyber-cyan   text-sm py-1.5 px-4">JOIN FREE</Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {user && menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t-2 border-cyber-border bg-cyber-darker overflow-hidden"
            style={{ background: '#0d0d0d' }}
          >
            <div className="px-4 py-3 flex flex-col gap-3">
              {user.role === 'bidder' && credits !== null && (
                <div className="font-mono text-xs text-cyber-yellow">
                  BALANCE: ₹{Number(credits).toLocaleString('en-IN')} CR
                </div>
              )}
              {user.role === 'admin' ? (
                <>
                  <MobileLink to="/admin"                 label="Dashboard"       close={() => setMenuOpen(false)} />
                  <MobileLink to="/admin/auctions/create" label="+ Create Auction" close={() => setMenuOpen(false)} />
                  <MobileLink to="/admin/credits"         label="Manage Credits"  close={() => setMenuOpen(false)} />
              <MobileLink to="/admin/pending"         label={pendingCount > 0 ? `Pending Approvals (${pendingCount})` : 'Pending Approvals'}  close={() => setMenuOpen(false)} />
                </>
              ) : (
                <>
                  <MobileLink to="/auctions"  label="Auctions"   close={() => setMenuOpen(false)} />
                  <MobileLink to="/dashboard" label="Dashboard"  close={() => setMenuOpen(false)} />
                  <MobileLink to="/won"            label="Won Items"      close={() => setMenuOpen(false)} />
              <MobileLink to="/submit-auction" label="+ Sell My Item"  close={() => setMenuOpen(false)} />
              <MobileLink to="/my-submissions" label="My Submissions" close={() => setMenuOpen(false)} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ── Sub-components ────────────────────────────────────────────
function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      className="relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors"
      style={{ color: active ? '#00f5ff' : '#888' }}
    >
      {label}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-cyan"
        />
      )}
    </Link>
  )
}

function NavLinkBadge({ to, label, active, count }) {
  return (
    <Link to={to}
      className="relative px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors"
      style={{ color: active ? '#00f5ff' : '#888' }}
    >
      {label}
      {count > 0 && (
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute', top: 2, right: 2,
            background: '#ff2d55', color: '#fff',
            fontFamily: 'DM Mono, monospace',
            fontSize: 9, fontWeight: 700,
            padding: '1px 4px', borderRadius: 0,
            minWidth: 14, textAlign: 'center',
          }}
        >
          {count}
        </motion.span>
      )}
      {active && (
        <motion.div layoutId="nav-underline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyber-cyan" />
      )}
    </Link>
  )
}

function MobileLink({ to, label, close }) {
  return (
    <Link
      to={to}
      onClick={close}
      className="font-mono text-sm text-gray-400 hover:text-cyber-cyan transition-colors py-1 border-b border-cyber-border"
    >
      {label}
    </Link>
  )
}
