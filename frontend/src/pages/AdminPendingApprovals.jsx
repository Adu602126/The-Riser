// pages/AdminPendingApprovals.jsx — The Riser
// Admin can approve or reject bidder-submitted auctions
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import toast from 'react-hot-toast'

export default function AdminPendingApprovals() {
  const { socket }              = useSocket()
  const [auctions, setAuctions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [rejectModal, setRejectModal] = useState(null) // auction being rejected
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    api.get('/auctions/pending')
      .then(({ data }) => setAuctions(data.auctions))
      .catch(() => toast.error('Failed to load pending auctions'))
      .finally(() => setLoading(false))
  }, [])

  // Live: new submission arrived
  useEffect(() => {
    if (!socket) return
    socket.on('auction:pending', ({ auction, submittedBy, message }) => {
      setAuctions(prev => [auction, ...prev])
      toast.custom(() => (
        <div className="neo-card border-cyber-yellow p-4" style={{ boxShadow: '4px 4px 0 #f5ff00' }}>
          <div className="text-cyber-yellow font-mono text-xs mb-1">📥 NEW SUBMISSION</div>
          <div className="text-white text-sm">{message}</div>
        </div>
      ), { duration: 6000 })
    })
    return () => socket.off('auction:pending')
  }, [socket])

  const handleApprove = async (auction) => {
    setProcessing(auction._id)
    try {
      const { data } = await api.post(`/auctions/${auction._id}/approve`)
      setAuctions(prev => prev.filter(a => a._id !== auction._id))
      toast.success(`✅ "${auction.title}" approved!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setProcessing(rejectModal._id)
    try {
      await api.post(`/auctions/${rejectModal._id}/reject`, { reason: rejectReason || 'Does not meet platform guidelines' })
      setAuctions(prev => prev.filter(a => a._id !== rejectModal._id))
      toast.success(`Auction rejected`)
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <div className="mb-8 border-b-2 border-cyber-border pb-4 flex items-end justify-between">
          <div>
            <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
              // ADMIN PANEL
            </div>
            <h1 className="font-display text-4xl text-white tracking-wider">
              PENDING<br />
              <span className="text-cyber-yellow">APPROVALS</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {auctions.length > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="font-display text-3xl text-cyber-yellow"
              >
                {auctions.length}
              </motion.div>
            )}
            <Link to="/admin" className="btn-cyber-outline text-sm">← BACK</Link>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center font-mono text-cyber-cyan animate-pulse">LOADING...</div>
        ) : auctions.length === 0 ? (
          <div className="py-24 text-center">
            <div className="font-display text-5xl text-gray-800 mb-4">ALL CLEAR</div>
            <div className="font-mono text-sm text-gray-600">
              No pending auction submissions right now
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {auctions.map((auction, i) => (
                <motion.div
                  key={auction._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="neo-card-yellow overflow-hidden"
                  style={{ boxShadow: '4px 4px 0 #f5ff00' }}
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-5">

                    {/* Image */}
                    <img src={auction.imageUrl} alt={auction.title}
                      className="w-full sm:w-36 h-36 object-cover border border-cyber-yellow/30 flex-shrink-0" />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-display text-2xl text-white tracking-wide leading-tight">
                          {auction.title}
                        </h3>
                        <span className="badge-upcoming flex-shrink-0">⏳ PENDING</span>
                      </div>

                      <p className="font-mono text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">
                        {auction.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div>
                          <div className="font-mono text-xs text-gray-600">SUBMITTED BY</div>
                          <div className="font-mono text-sm text-white">{auction.createdBy?.name}</div>
                          <div className="font-mono text-xs text-gray-600">{auction.createdBy?.email}</div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-gray-600">START PRICE</div>
                          <div className="font-mono text-sm text-cyber-cyan">
                            ₹{auction.startPrice.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-gray-600">INCREMENT</div>
                          <div className="font-mono text-sm text-cyber-green">
                            +{auction.bidIncrement.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-xs text-gray-600">DURATION</div>
                          <div className="font-mono text-xs text-gray-400">
                            {new Date(auction.startTime).toLocaleDateString('en-IN')}
                            <br />→ {new Date(auction.endTime).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <motion.button
                          onClick={() => handleApprove(auction)}
                          disabled={!!processing}
                          className="font-mono text-sm font-bold px-6 py-2.5 border-2 border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black transition-colors disabled:opacity-40"
                          whileTap={{ scale: 0.97 }}
                        >
                          {processing === auction._id ? '...' : '✅ APPROVE'}
                        </motion.button>
                        <motion.button
                          onClick={() => { setRejectModal(auction); setRejectReason('') }}
                          disabled={!!processing}
                          className="font-mono text-sm font-bold px-6 py-2.5 border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-colors disabled:opacity-40"
                          whileTap={{ scale: 0.97 }}
                        >
                          ❌ REJECT
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Reject reason modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={e => e.target === e.currentTarget && setRejectModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="neo-card w-full max-w-md p-6"
              style={{ borderColor: '#ff2d55', boxShadow: '6px 6px 0 #ff2d55' }}
            >
              <div className="font-display text-2xl text-cyber-red mb-1">REJECT AUCTION</div>
              <div className="font-mono text-xs text-gray-500 mb-4">
                "{rejectModal.title}" by {rejectModal.createdBy?.name}
              </div>
              <div>
                <label className="neo-label">REJECTION REASON</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                  className="neo-input resize-none"
                  placeholder="e.g. Item description is insufficient, Image quality too low..."
                />
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setRejectModal(null)}
                  className="btn-cyber-outline flex-1">CANCEL</button>
                <button onClick={handleReject} disabled={!!processing}
                  className="btn-cyber-red flex-1 disabled:opacity-40">
                  {processing ? '...' : 'CONFIRM REJECT'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
