// pages/SubmitAuction.jsx — The Riser
// Bidders can submit their own items for auction — admin approves/rejects
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SubmitAuction() {
  const navigate = useNavigate()
  const [loading,      setLoading]      = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile,    setImageFile]    = useState(null)
  const [submitted,    setSubmitted]    = useState(false)
  const [form, setForm] = useState({
    title:        '',
    description:  '',
    startTime:    '',
    endTime:      '',
    startPrice:   '',
    reservePrice: '',
    bidIncrement: '10000',
  })

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile) { toast.error('Please upload an image of your item'); return }
    if (new Date(form.endTime) <= new Date(form.startTime)) {
      toast.error('End time must be after start time'); return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      fd.append('image', imageFile)

      await api.post('/auctions/submit', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setSubmitted(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-cyber-black grid-bg flex items-center justify-center px-4">
        <Navbar />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          className="max-w-md w-full text-center"
          style={{ paddingTop: 80 }}
        >
          <motion.div className="text-7xl mb-4"
            animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8 }}>
            🎉
          </motion.div>

          <div className="neo-card-cyan p-8" style={{ boxShadow: '6px 6px 0 #00f5ff' }}>
            <div className="font-display text-4xl text-cyber-cyan mb-2 tracking-wider">
              SUBMITTED!
            </div>
            <div className="font-mono text-sm text-gray-400 mb-6 leading-relaxed">
              Your auction has been submitted for admin review. You'll receive a notification
              once it's approved or rejected.
            </div>

            <div className="neo-card border-cyber-border p-4 mb-6 text-left space-y-2">
              {[
                { icon: '⏳', text: 'Admin will review your submission' },
                { icon: '✅', text: 'On approval — auction goes live automatically' },
                { icon: '🔔', text: 'You\'ll get notified instantly either way' },
                { icon: '💰', text: 'If sold, winning credits go to platform' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 font-mono text-xs text-gray-400">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link to="/my-submissions" className="btn-cyber-outline flex-1 text-center text-sm">
                MY SUBMISSIONS
              </Link>
              <Link to="/auctions" className="btn-cyber-cyan flex-1 text-center text-sm">
                BROWSE AUCTIONS
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <div className="mb-8 border-b-2 border-cyber-border pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">
            // BIDDER PANEL
          </div>
          <h1 className="font-display text-5xl text-white tracking-wider">
            SUBMIT<br />
            <span className="text-cyber-cyan">AUCTION ITEM</span>
          </h1>
          <p className="font-mono text-sm text-gray-500 mt-2">
            Submit your item for auction — Admin will review and approve within 24 hours
          </p>
        </div>

        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="neo-card border-cyber-yellow p-4 mb-6 flex items-start gap-3"
          style={{ boxShadow: '3px 3px 0 #f5ff00' }}
        >
          <span className="text-xl flex-shrink-0">⚡</span>
          <div className="font-mono text-xs text-gray-400 leading-relaxed">
            <span className="text-cyber-yellow font-bold">How it works: </span>
            Fill in your item details → Admin reviews → Gets approved → Goes live for bidding!
            You'll get a real-time notification on approval/rejection.
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Left: Image + Description */}
            <div className="space-y-4">

              {/* Image upload */}
              <div>
                <label className="neo-label">ITEM IMAGE *</label>
                <div
                  className="neo-card border-cyber-border aspect-video flex items-center justify-center relative overflow-hidden"
                  style={{
                    cursor: 'none',
                    borderColor: imagePreview ? '#00f5ff' : '#2a2a2a',
                    boxShadow: imagePreview ? '4px 4px 0 #00f5ff' : 'none',
                    transition: 'all 0.3s',
                  }}
                  onClick={() => document.getElementById('item-img').click()}
                >
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview"
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center
                        opacity-0 hover:opacity-100 transition-opacity">
                        <span className="font-mono text-xs text-white uppercase tracking-widest">
                          CHANGE IMAGE
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="text-5xl mb-3 opacity-20">📸</div>
                      <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
                        CLICK TO UPLOAD YOUR ITEM PHOTO
                      </div>
                      <div className="font-mono text-xs text-gray-700 mt-1">
                        JPG, PNG, WEBP · Max 5MB
                      </div>
                    </div>
                  )}
                  <input id="item-img" type="file" accept="image/*"
                    onChange={handleImage} className="hidden" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="neo-label">ITEM DESCRIPTION *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  className="neo-input resize-none"
                  placeholder="Describe your item in detail — condition, brand, authenticity, what's included..."
                  required
                />
                <div className="font-mono text-xs text-gray-700 mt-1">
                  Tip: More detail = higher chance of approval
                </div>
              </div>

              {/* My submissions link */}
              <Link to="/my-submissions"
                className="font-mono text-xs text-gray-500 hover:text-cyber-cyan transition-colors flex items-center gap-1">
                → View my previous submissions
              </Link>
            </div>

            {/* Right: Form fields */}
            <div className="space-y-4">

              <div>
                <label className="neo-label">ITEM TITLE *</label>
                <input type="text" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="neo-input" placeholder="e.g. Nike Air Jordan 1 Retro High OG"
                  required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="neo-label">START TIME *</label>
                  <input type="datetime-local" value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    className="neo-input" required />
                </div>
                <div>
                  <label className="neo-label">END TIME *</label>
                  <input type="datetime-local" value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    className="neo-input" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="neo-label">START PRICE (CR) *</label>
                  <input type="number" value={form.startPrice}
                    onChange={e => setForm({ ...form, startPrice: e.target.value })}
                    className="neo-input" placeholder="e.g. 100000" min="1" required />
                </div>
                <div>
                  <label className="neo-label">BID INCREMENT (CR) *</label>
                  <input type="number" value={form.bidIncrement}
                    onChange={e => setForm({ ...form, bidIncrement: e.target.value })}
                    className="neo-input" placeholder="e.g. 10000" min="1" required />
                </div>
              </div>

              <div>
                <label className="neo-label">RESERVE PRICE (CR) — OPTIONAL</label>
                <input type="number" value={form.reservePrice}
                  onChange={e => setForm({ ...form, reservePrice: e.target.value })}
                  className="neo-input" placeholder="Minimum price you'll accept (hidden from bidders)"
                  min="0" />
              </div>

              {/* Live preview */}
              <AnimatePresence>
                {(form.title || form.startPrice) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="neo-card border-cyber-border p-4"
                    style={{ background: '#111' }}
                  >
                    <div className="font-mono text-xs text-gray-600 uppercase tracking-widest mb-3">
                      SUBMISSION PREVIEW
                    </div>
                    <div className="space-y-2 font-mono text-xs">
                      {form.title && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Item:</span>
                          <span className="text-white truncate max-w-[160px]">{form.title}</span>
                        </div>
                      )}
                      {form.startPrice && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Start Price:</span>
                          <span className="text-cyber-cyan">
                            ₹{Number(form.startPrice).toLocaleString('en-IN')} CR
                          </span>
                        </div>
                      )}
                      {form.bidIncrement && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Increment:</span>
                          <span className="text-cyber-green">
                            +{Number(form.bidIncrement).toLocaleString('en-IN')} CR
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status after submit:</span>
                        <span className="text-cyber-yellow">PENDING APPROVAL</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => navigate(-1)}
                  className="btn-cyber-outline flex-1">
                  CANCEL
                </button>
                <motion.button
                  type="submit"
                  disabled={loading}
                  className="btn-cyber-cyan flex-1 disabled:opacity-50"
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                        ⟳
                      </motion.span>
                      SUBMITTING...
                    </span>
                  ) : (
                    '📤 SUBMIT FOR APPROVAL'
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
