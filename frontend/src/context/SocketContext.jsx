// context/SocketContext.jsx — The Riser
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function SocketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketRef.current.on('connect', () => {
      setConnected(true)
      console.log('🔌 Socket connected:', socketRef.current.id)
    })

    socketRef.current.on('disconnect', () => {
      setConnected(false)
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  // Join personal user room when user logs in
  useEffect(() => {
    if (user && socketRef.current?.connected) {
      socketRef.current.emit('user:join', user._id)
    }
  }, [user, connected])

  // Global notification listeners (outbid, won, streak, bidpulse)
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    // Outbid notification
    socket.on('bid:outbid', ({ auctionTitle, newAmount, message }) => {
      toast.custom(
        (t) => (
          <div className={`neo-card border-cyber-red p-4 ${t.visible ? 'animate-enter' : 'animate-leave'}`}
               style={{ boxShadow: '4px 4px 0 #ff2d55', minWidth: 280 }}>
            <div className="text-cyber-red font-mono text-xs uppercase tracking-widest mb-1">⚠ OUTBID</div>
            <div className="text-white text-sm">{message}</div>
          </div>
        ),
        { duration: 5000 }
      )
    })

    // Won auction notification
    socket.on('auction:won', ({ auctionTitle, winningBid, message }) => {
      toast.custom(
        (t) => (
          <div className={`neo-card border-cyber-yellow p-4 ${t.visible ? 'animate-enter' : ''}`}
               style={{ boxShadow: '4px 4px 0 #f5ff00', minWidth: 280 }}>
            <div className="text-cyber-yellow font-mono text-xs uppercase tracking-widest mb-1">🏆 YOU WON!</div>
            <div className="text-white text-sm">{message}</div>
          </div>
        ),
        { duration: 8000 }
      )
    })

    // Streak bonus notification
    socket.on('streak:bonus', ({ streak, bonus, message }) => {
      toast.custom(
        (t) => (
          <div className={`neo-card border-cyber-purple p-4`}
               style={{ boxShadow: '4px 4px 0 #bf00ff', minWidth: 280 }}>
            <div className="text-cyber-purple font-mono text-xs uppercase tracking-widest mb-1">🔥 STREAK BONUS</div>
            <div className="text-white text-sm">{message}</div>
          </div>
        ),
        { duration: 5000 }
      )
    })

    // BidPulse notifications
    socket.on('bidpulse:auto_bid_placed', ({ amount, message }) => {
      toast(message, { icon: '⚡', duration: 3000 })
    })

    socket.on('bidpulse:budget_reached', ({ message }) => {
      toast(message, { icon: '🛑', duration: 4000 })
    })

    socket.on('bidpulse:insufficient_credits', ({ message }) => {
      toast.error(message || 'BidPulse stopped: insufficient credits')
    })

    socket.on('bidpulse:cancelled', () => {
      toast('BidPulse deactivated', { icon: '⚡', duration: 2000 })
    })

    return () => {
      socket.off('bid:outbid')
      socket.off('auction:won')
      socket.off('streak:bonus')
      socket.off('bidpulse:auto_bid_placed')
      socket.off('bidpulse:budget_reached')
      socket.off('bidpulse:insufficient_credits')
      socket.off('bidpulse:cancelled')
    }
  }, [connected])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
