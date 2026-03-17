// pages/WonItems.jsx — The Riser
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../context/AuthContext'
import Navbar from '../components/common/Navbar'
import toast from 'react-hot-toast'

export default function WonItems() {
  const [wonItems, setWonItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/bids/won')
      .then(({ data }) => setWonItems(data.wonAuctions))
      .catch(() => toast.error('Failed to load won items'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-cyber-black grid-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="mb-8">
          <div className="font-mono text-xs text-cyber-yellow uppercase tracking-widest mb-1">TROPHY ROOM</div>
          <h1 className="font-display text-5xl text-white">
            ITEMS<br /><span className="text-cyber-yellow">WON</span>
          </h1>
          <p className="font-mono text-sm text-gray-500 mt-2">{wonItems.length} item{wonItems.length !== 1 ? 's' : ''} in your collection</p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="neo-card border-cyber-border p-4 animate-pulse">
                <div className="bg-cyber-dark w-full h-40 mb-3" />
                <div className="bg-cyber-dark h-4 w-3/4 mb-2" />
                <div className="bg-cyber-dark h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : wonItems.length > 0 ? (
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            {wonItems.map(auction => (
              <motion.div
                key={auction._id}
                variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                className="neo-card-yellow group relative overflow-hidden"
              >
                {/* Trophy badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-cyber-yellow text-cyber-black font-mono text-xs font-bold px-2 py-0.5">
                    🏆 WON
                  </span>
                </div>

                <img
                  src={auction.imageUrl}
                  alt={auction.title}
                  className="w-full h-44 object-cover border-b-2 border-cyber-yellow group-hover:opacity-90 transition-opacity"
                />

                <div className="p-4">
                  <h3 className="font-semibold text-white text-base leading-snug mb-2">
                    {auction.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-gray-500">Winning bid</div>
                      <div className="font-display text-2xl text-cyber-yellow">{auction.winningBid}</div>
                      <div className="font-mono text-xs text-gray-600">credits</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-gray-500">Closed</div>
                      <div className="font-mono text-xs text-gray-400">
                        {new Date(auction.updatedAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center">
            <div className="font-display text-8xl text-gray-800 mb-4">0</div>
            <div className="font-mono text-sm text-gray-600 mb-6">
              Your trophy room is empty. Start bidding to win items!
            </div>
            <Link to="/auctions" className="btn-cyber-cyan">BROWSE AUCTIONS →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
