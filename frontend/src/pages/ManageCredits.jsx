// pages/ManageCredits.jsx — The Riser
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/common/Navbar'
import { api } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function ManageCredits() {
  const [bidders, setBidders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [action, setAction] = useState('topup')
  const [submitting, setSubmitting] = useState(false)

  const fetchBidders = () => {
    api.get('/credits/users').then(({ data }) => setBidders(data.bidders))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBidders() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) { toast.error('Select a bidder first'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }

    setSubmitting(true)
    try {
      const endpoint = action === 'topup' ? '/credits/topup' : '/credits/deduct'
      const { data } = await api.post(endpoint, {
        userId: selected._id,
        amount: Number(amount),
        reason,
      })
      toast.success(data.message)
      setAmount('')
      setReason('')
      setSelected(null)
      fetchBidders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-12">

        <div className="mb-8 border-b-2 border-cyber-border pb-4">
          <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">// ADMIN</div>
          <h1 className="font-display text-5xl text-white tracking-wider">MANAGE CREDITS</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Bidder list */}
          <div className="lg:col-span-2 neo-card border-cyber-cyan p-0 overflow-hidden">
            <div className="px-5 py-4 border-b-2 border-cyber-border flex items-center justify-between">
              <div className="font-display text-xl text-white tracking-wider">ALL BIDDERS</div>
              <div className="font-mono text-xs text-gray-500">{bidders.length} USERS</div>
            </div>

            {loading ? (
              <div className="p-8 text-center font-mono text-cyber-cyan animate-pulse text-sm">LOADING...</div>
            ) : (
              <div className="divide-y divide-cyber-border/50 max-h-[500px] overflow-y-auto">
                {bidders.map((bidder, i) => (
                  <motion.div
                    key={bidder._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setSelected(bidder)}
                    className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors
                      ${selected?._id === bidder._id
                        ? 'bg-cyber-cyan/10 border-l-2 border-cyber-cyan'
                        : 'hover:bg-cyber-dark/50'
                      }`}
                  >
                    <div>
                      <div className="font-ui text-sm text-white">{bidder.name}</div>
                      <div className="font-mono text-xs text-gray-500">{bidder.email}</div>
                      <div className="font-mono text-xs text-gray-600 mt-0.5">{bidder.totalBidsPlaced} total bids</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-cyber-cyan">{bidder.credits.toLocaleString()}</div>
                      <div className="font-mono text-xs text-gray-500">CREDITS</div>
                      {bidder.bidCoins > 0 && (
                        <div className="font-mono text-xs text-cyber-purple">🪙 {bidder.bidCoins} COINS</div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Credit action panel */}
          <div className="neo-card-yellow p-6 h-fit">
            <div className="font-display text-xl text-white tracking-wider mb-5">CREDIT ACTION</div>

            {selected ? (
              <div className="neo-card p-3 mb-5 border-cyber-cyan">
                <div className="font-mono text-xs text-gray-500">SELECTED BIDDER</div>
                <div className="font-ui text-sm text-white mt-1">{selected.name}</div>
                <div className="font-mono text-xs text-gray-500">{selected.email}</div>
                <div className="font-display text-2xl text-cyber-cyan mt-2">
                  {selected.credits.toLocaleString()} CR
                </div>
              </div>
            ) : (
              <div className="neo-card p-4 mb-5 border-dashed text-center">
                <div className="font-mono text-xs text-gray-600">← SELECT A BIDDER FROM THE LIST</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Action toggle */}
              <div className="grid grid-cols-2 gap-2">
                {['topup', 'deduct'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAction(a)}
                    className={`font-mono text-xs uppercase tracking-widest py-2 border-2 transition-colors
                      ${action === a
                        ? a === 'topup'
                          ? 'bg-cyber-green text-black border-cyber-green'
                          : 'bg-cyber-red text-white border-cyber-red'
                        : 'bg-transparent text-gray-500 border-cyber-border hover:border-gray-400'
                      }`}
                  >
                    {a === 'topup' ? '+ TOP UP' : '− DEDUCT'}
                  </button>
                ))}
              </div>

              <div>
                <label className="neo-label">AMOUNT (CREDITS)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  className="neo-input"
                  required
                />
              </div>

              <div>
                <label className="neo-label">REASON (OPTIONAL)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Initial allocation"
                  className="neo-input"
                />
              </div>

              {/* Preview */}
              {selected && amount && (
                <div className="font-mono text-xs text-gray-500 bg-cyber-dark p-3">
                  {action === 'topup' ? (
                    <span className="text-cyber-green">
                      {selected.credits.toLocaleString()} + {Number(amount).toLocaleString()} ={' '}
                      <strong className="text-white">{(selected.credits + Number(amount)).toLocaleString()} CR</strong>
                    </span>
                  ) : (
                    <span className="text-cyber-red">
                      {selected.credits.toLocaleString()} − {Number(amount).toLocaleString()} ={' '}
                      <strong className="text-white">{Math.max(0, selected.credits - Number(amount)).toLocaleString()} CR</strong>
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selected}
                className={`w-full disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm uppercase tracking-widest py-3 border-2 transition-all
                  ${action === 'topup'
                    ? 'bg-cyber-green text-black border-cyber-green hover:opacity-90'
                    : 'bg-cyber-red text-white border-cyber-red hover:opacity-90'
                  }`}
              >
                {submitting ? 'PROCESSING...' : `CONFIRM ${action.toUpperCase()}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
