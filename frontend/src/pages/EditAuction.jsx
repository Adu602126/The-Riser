// pages/EditAuction.jsx — The Riser
import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../context/AuthContext'
import Navbar from '../components/common/Navbar'
import toast from 'react-hot-toast'

export default function EditAuction() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', startTime: '', endTime: '',
    startPrice: '', reservePrice: '', bidIncrement: 10,
  })

  useEffect(() => {
    api.get(`/auctions/${id}`).then(({ data }) => {
      const a = data.auction
      const fmt = (d) => new Date(d).toISOString().slice(0, 16)
      setForm({
        title: a.title, description: a.description,
        startTime: fmt(a.startTime), endTime: fmt(a.endTime),
        startPrice: a.startPrice, reservePrice: a.reservePrice || '',
        bidIncrement: a.bidIncrement,
      })
      setPreview(a.imageUrl)
    }).catch(() => toast.error('Failed to load auction'))
      .finally(() => setLoading(false))
  }, [id])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.target)
      await api.put(`/auctions/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Auction updated!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-cyber-black flex items-center justify-center">
      <div className="font-mono text-cyber-cyan animate-pulse">LOADING...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-cyber-black">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/admin" className="font-mono text-xs text-cyber-cyan uppercase tracking-widest hover:underline">← BACK TO ADMIN</Link>
          <h1 className="font-display text-5xl text-white mt-3">EDIT<br /><span className="text-cyber-yellow">AUCTION</span></h1>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="neo-card-yellow p-8">
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-5">
            <div>
              <label className="neo-label">Title</label>
              <input className="neo-input" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="neo-label">Description</label>
              <textarea className="neo-input" name="description" rows={3} value={form.description} onChange={handleChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="neo-label">Start Time</label>
                <input className="neo-input" type="datetime-local" name="startTime" value={form.startTime} onChange={handleChange} required />
              </div>
              <div>
                <label className="neo-label">End Time</label>
                <input className="neo-input" type="datetime-local" name="endTime" value={form.endTime} onChange={handleChange} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="neo-label">Start Price (cr)</label>
                <input className="neo-input" type="number" name="startPrice" value={form.startPrice} onChange={handleChange} min="1" required />
              </div>
              <div>
                <label className="neo-label">Reserve Price (optional)</label>
                <input className="neo-input" type="number" name="reservePrice" value={form.reservePrice} onChange={handleChange} min="0" />
              </div>
              <div>
                <label className="neo-label">Bid Increment (cr)</label>
                <input className="neo-input" type="number" name="bidIncrement" value={form.bidIncrement} onChange={handleChange} min="1" required />
              </div>
            </div>
            <div>
              <label className="neo-label">Replace Image (optional)</label>
              {preview && <img src={preview} alt="preview" className="w-full h-40 object-cover border border-cyber-border mb-2" />}
              <input className="neo-input" type="file" name="image" accept="image/*" onChange={handleFileChange} />
            </div>
            <button type="submit" disabled={submitting}
              className="btn-cyber-cyan w-full disabled:opacity-50">
              {submitting ? 'SAVING...' : 'UPDATE AUCTION →'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
