// pages/CreateAuction.jsx — The Riser
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function CreateAuction() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [form, setForm] = useState({
    title: '', description: '', startTime: '', endTime: '',
    startPrice: '', reservePrice: '', bidIncrement: '10',
  })
  const [imageFile, setImageFile] = useState(null)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile) { toast.error('Please upload an auction image'); return }

    const start = new Date(form.startTime)
    const end   = new Date(form.endTime)
    if (end <= start) { toast.error('End time must be after start time'); return }

    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v))
      formData.append('image', imageFile)

      await api.post('/auctions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Auction created successfully!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create auction')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, name, type = 'text', placeholder, required = true, min }) => (
    <div>
      <label className="neo-label">{label}</label>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        placeholder={placeholder}
        required={required}
        min={min}
        className="neo-input"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-12">

        {/* Header */}
        <div className="mb-8 border-b-2 border-cyber-border pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">// ADMIN</div>
          <h1 className="font-display text-5xl text-white tracking-wider">CREATE AUCTION</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Left: Image upload */}
            <div className="space-y-4">
              <div className="neo-card-cyan aspect-video flex items-center justify-center relative overflow-hidden cursor-pointer"
                   onClick={() => document.getElementById('img-upload').click()}>
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="font-mono text-xs text-white uppercase tracking-widest">CHANGE IMAGE</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="text-4xl mb-2 opacity-30">📷</div>
                    <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">CLICK TO UPLOAD IMAGE</div>
                    <div className="font-mono text-xs text-gray-700 mt-1">JPG, PNG, WEBP · Max 5MB</div>
                  </div>
                )}
                <input
                  id="img-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Description */}
              <div>
                <label className="neo-label">DESCRIPTION</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  className="neo-input resize-none"
                  placeholder="Describe the auction item in detail..."
                  required
                />
              </div>
            </div>

            {/* Right: Form fields */}
            <div className="space-y-4">
              <Field label="AUCTION TITLE" name="title" placeholder="e.g. Vintage Gibson Guitar" />

              <div className="grid grid-cols-2 gap-4">
                <Field label="START TIME" name="startTime" type="datetime-local" />
                <Field label="END TIME"   name="endTime"   type="datetime-local" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="START PRICE (CR)" name="startPrice" type="number" placeholder="e.g. 100" min="0" />
                <Field label="BID INCREMENT (CR)" name="bidIncrement" type="number" placeholder="e.g. 10" min="1" />
              </div>

              <div>
                <label className="neo-label">RESERVE PRICE (CR) — OPTIONAL</label>
                <input
                  type="number"
                  value={form.reservePrice}
                  onChange={(e) => setForm({ ...form, reservePrice: e.target.value })}
                  placeholder="Leave blank for no reserve"
                  min="0"
                  className="neo-input"
                />
                <div className="font-mono text-xs text-gray-600 mt-1">
                  Hidden minimum price. Winner must meet this to claim the item.
                </div>
              </div>

              {/* Preview card */}
              {(form.startPrice || form.bidIncrement) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="neo-card border-cyber-border p-4 bg-cyber-dark"
                >
                  <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-3">PREVIEW</div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <span className="text-gray-500">Start: </span>
                      <span className="text-cyber-cyan">{Number(form.startPrice || 0).toLocaleString()} CR</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Increment: </span>
                      <span className="text-cyber-green">+{Number(form.bidIncrement || 0).toLocaleString()} CR</span>
                    </div>
                    {form.reservePrice && (
                      <div>
                        <span className="text-gray-500">Reserve: </span>
                        <span className="text-cyber-yellow">{Number(form.reservePrice).toLocaleString()} CR</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="btn-cyber-outline flex-1"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-cyber-cyan flex-1 disabled:opacity-50"
                >
                  {loading ? 'UPLOADING...' : 'CREATE AUCTION'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
