// ============================================================
// The Riser — server.js
// Team: Aditya Das (Leader), Abhishek Raj, Alok Kumar
// ============================================================
const cors = require('cors');
app.use(cors()); // Ye line sabhi domains ko access de degi

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
const creditRoutes = require('./routes/credits');
const adminRoutes  = require('./routes/admin');
const geminiRoutes = require('./routes/gemini');
const { initSocketHandlers } = require('./socket/socketHandlers');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so routes can emit events
app.set('io', io);

// Serve locally uploaded images (fallback when Cloudinary not configured)
const path = require('path');
const fs   = require('fs');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', require('express').static(uploadDir));

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids',     bidRoutes);
app.use('/api/credits',  creditRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/gemini',   geminiRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', team: 'The Riser' }));

// ── Socket.io event handlers (BidPulse engine lives here) ───
initSocketHandlers(io);

// ── Auto-close expired auctions (polls every 30s) ───────────
const Auction = require('./models/Auction');
const { declareWinner } = require('./utils/winnerUtils');

setInterval(async () => {
  try {
    const expired = await Auction.find({
      status: 'active',
      endTime: { $lte: new Date() },
    });
    for (const auction of expired) {
      await declareWinner(auction, io);
    }
  } catch (err) {
    console.error('Auto-close error:', err.message);
  }
}, 30_000);

// ── MongoDB connection ───────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () =>
      console.log(`🚀 The Riser server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
