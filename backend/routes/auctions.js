// routes/auctions.js — The Riser (FULLY FIXED)
// IMPORTANT: Specific string routes (/pending, /submit, /my-submissions)
// MUST come BEFORE the /:id wildcard — otherwise Express catches them as IDs.

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const Auction = require('../models/Auction');
const { protect, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Image upload setup ────────────────────────────────────────
// Uses Cloudinary if keys are in .env, else saves to local disk.
let upload;
let useCloudinary = false;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name'
) {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const multer = require('multer');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'the-riser/auctions',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation:  [{ width: 1200, height: 800, crop: 'limit' }],
    },
  });
  upload        = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
  useCloudinary = true;
  console.log('✅ Cloudinary configured');
} else {
  const multer   = require('multer');
  const uploads  = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true });
  const storage  = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploads),
    filename:    (req, file, cb) => {
      cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
    },
  });
  upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
  console.log('⚠️  No Cloudinary — using local disk for images');
}

function getImageUrl(req, file) {
  if (!file) return null;
  if (useCloudinary) return file.path;
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
}

// ════════════════════════════════════════════════════════════
// SPECIFIC ROUTES FIRST — before /:id wildcard
// ════════════════════════════════════════════════════════════

// GET /api/auctions/pending — Admin: all pending submissions
router.get('/pending', protect, requireRole('admin'), async (req, res) => {
  try {
    const auctions = await Auction.find({ status: 'pending_approval' })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    res.json({ auctions, count: auctions.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auctions/my-submissions — Bidder: their own submissions
router.get('/my-submissions', protect, requireRole('bidder'), async (req, res) => {
  try {
    const auctions = await Auction.find({
      createdBy: req.user._id,
      submittedByBidder: true,
    }).sort('-createdAt');
    res.json({ auctions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auctions/submit — Bidder submits item for approval
router.post(
  '/submit',
  protect,
  requireRole('bidder'),
  upload.single('image'),
  async (req, res) => {
    try {
      const {
        title, description, startTime, endTime,
        startPrice, reservePrice, bidIncrement,
      } = req.body;

      const imageUrl = getImageUrl(req, req.file);
      if (!imageUrl) return res.status(400).json({ message: 'Image is required' });

      const auction = await Auction.create({
        title,
        description,
        imageUrl,
        imagePublicId:     req.file?.filename || req.file?.public_id || null,
        startTime:         new Date(startTime),
        endTime:           new Date(endTime),
        startPrice:        Number(startPrice),
        reservePrice:      reservePrice ? Number(reservePrice) : null,
        bidIncrement:      Number(bidIncrement) || 10000,
        createdBy:         req.user._id,
        status:            'pending_approval',
        submittedByBidder: true,
      });

      const io = req.app.get('io');
      if (io) io.emit('auction:pending', {
        auction,
        submittedBy: { name: req.user.name, email: req.user.email },
        message:     `New auction submitted by ${req.user.name}: "${title}"`,
      });

      res.status(201).json({
        auction,
        message: 'Auction submitted for admin approval! You will be notified once approved.',
      });
    } catch (err) {
      console.error('Submit auction error:', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ════════════════════════════════════════════════════════════
// GENERAL ROUTES
// ════════════════════════════════════════════════════════════

// GET /api/auctions — Public listing with filters
router.get('/', async (req, res) => {
  try {
    const { status, search, sort = '-createdAt', page = 1, limit = 12 } = req.query;

    const filter = {};
    // Don't show pending/rejected auctions to public
    if (status) {
      filter.status = status;
    } else {
      filter.status = { $in: ['upcoming', 'active', 'ended'] };
    }
    if (search) filter.title = { $regex: search, $options: 'i' };

    const auctions = await Auction.find(filter)
      .populate('createdBy',     'name')
      .populate('currentWinner', 'name')
      .sort(sort)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Auction.countDocuments(filter);
    res.json({ auctions, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auctions — Admin: create auction directly
router.post(
  '/',
  protect,
  requireRole('admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      const {
        title, description, startTime, endTime,
        startPrice, reservePrice, bidIncrement,
      } = req.body;

      const imageUrl = getImageUrl(req, req.file);
      if (!imageUrl) return res.status(400).json({ message: 'Image is required' });

      const auction = await Auction.create({
        title,
        description,
        imageUrl,
        imagePublicId: req.file?.filename || req.file?.public_id || null,
        startTime:     new Date(startTime),
        endTime:       new Date(endTime),
        startPrice:    Number(startPrice),
        reservePrice:  reservePrice ? Number(reservePrice) : null,
        bidIncrement:  Number(bidIncrement) || 10,
        createdBy:     req.user._id,
      });

      const io = req.app.get('io');
      if (io) io.emit('auction:created', auction);

      res.status(201).json({ auction });
    } catch (err) {
      console.error('Create auction error:', err.message);
      res.status(500).json({ message: err.message });
    }
  }
);

// ════════════════════════════════════════════════════════════
// /:id WILDCARD ROUTES — MUST be LAST
// ════════════════════════════════════════════════════════════

// GET /api/auctions/:id
router.get('/:id', async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('createdBy',     'name')
      .populate('currentWinner', 'name')
      .populate('winner',        'name email');
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    res.json({ auction });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auctions/:id — Admin: edit
router.put(
  '/:id',
  protect,
  requireRole('admin'),
  upload.single('image'),
  async (req, res) => {
    try {
      const auction = await Auction.findById(req.params.id);
      if (!auction) return res.status(404).json({ message: 'Auction not found' });
      if (auction.status !== 'upcoming')
        return res.status(400).json({ message: 'Cannot edit an active or ended auction' });

      const updates = { ...req.body };
      if (req.file) {
        updates.imageUrl      = getImageUrl(req, req.file);
        updates.imagePublicId = req.file?.filename || req.file?.public_id || null;
      }
      const updated = await Auction.findByIdAndUpdate(req.params.id, updates, { new: true });
      res.json({ auction: updated });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// DELETE /api/auctions/:id — Admin: delete
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status === 'active')
      return res.status(400).json({ message: 'Cannot delete an active auction. Close it first.' });
    await auction.deleteOne();
    res.json({ message: 'Auction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auctions/:id/declare-winner — Admin
router.post('/:id/declare-winner', protect, requireRole('admin'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status === 'ended') return res.status(400).json({ message: 'Already ended' });
    const { declareWinner } = require('../utils/winnerUtils');
    const io = req.app.get('io');
    const result = await declareWinner(auction, io);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auctions/:id/approve — Admin: approve pending
router.post('/:id/approve', protect, requireRole('admin'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'pending_approval')
      return res.status(400).json({ message: 'Auction is not pending approval' });

    const now       = new Date();
    let newStatus   = 'upcoming';
    if (auction.startTime <= now && auction.endTime > now) newStatus = 'active';

    auction.status     = newStatus;
    auction.approvedBy = req.user._id;
    await auction.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${auction.createdBy}`).emit('auction:approved', {
        auctionId:    auction._id,
        auctionTitle: auction.title,
        status:       newStatus,
        message:      `🎉 Your auction "${auction.title}" has been APPROVED and is now ${newStatus.toUpperCase()}!`,
      });
      io.emit('auction:created', auction);
    }

    const populated = await Auction.findById(auction._id).populate('createdBy', 'name email');
    res.json({ auction: populated, message: `Auction approved — status: ${newStatus}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auctions/:id/reject — Admin: reject pending
router.post('/:id/reject', protect, requireRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (auction.status !== 'pending_approval')
      return res.status(400).json({ message: 'Auction is not pending approval' });

    auction.status          = 'rejected';
    auction.rejectionReason = reason || 'Does not meet platform guidelines';
    await auction.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${auction.createdBy}`).emit('auction:rejected', {
        auctionId:    auction._id,
        auctionTitle: auction.title,
        reason:       auction.rejectionReason,
        message:      `❌ Your auction "${auction.title}" was rejected. Reason: ${auction.rejectionReason}`,
      });
    }

    res.json({ message: 'Auction rejected', reason: auction.rejectionReason });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Single export at the very end ────────────────────────────
module.exports = router;
