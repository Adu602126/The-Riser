// backend/scripts/seed.js
// ─────────────────────────────────────────────────────────────
// The Riser — Full Demo Seed
// Team: Aditya Das (Leader), Abhishek Raj, Alok Kumar
//
// Usage:
//   cd backend
//   node scripts/seed.js
//
// What it does:
//   1. Updates ALL existing users credits to 1 Crore
//   2. Creates admin + 3 bidder accounts (all with 1 Crore credits)
//   3. Seeds 3 sample auction items (Active, Upcoming, Ended)
// ─────────────────────────────────────────────────────────────

require('dotenv').config({ path: '../.env' })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('../models/User')
const Auction  = require('../models/Auction')

const ONE_CRORE = 10_000_000   // 1,00,00,000

// ── Time helpers ──────────────────────────────────────────────
const now = new Date()
const hoursAgo    = (h) => new Date(now.getTime() - h * 3600_000)
const hoursFromNow = (h) => new Date(now.getTime() + h * 3600_000)

// ── Demo auction items ────────────────────────────────────────
const AUCTION_ITEMS = [
  {
    // ① ACTIVE — started 2 hours ago, ends in 3 hours
    title: 'Louis Vuitton Neverfull MM Tote',
    description:
      'Authentic Louis Vuitton Neverfull MM in classic Monogram canvas. ' +
      'Gold-tone hardware, microfibre lining, removable pochette included. ' +
      'Barely used — certificate of authenticity provided.',
    imageUrl:
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=900&auto=format&fit=crop&q=85',
    startTime:    hoursAgo(2),
    endTime:      hoursFromNow(3),
    startPrice:   500_000,
    reservePrice: 800_000,
    bidIncrement: 25_000,
    status:       'active',
    currentPrice: 650_000,
    totalBids:    7,
    reserveMet:   false,
  },
  {
    // ② UPCOMING — starts in 4 hours, ends in 28 hours
    title: 'Ben 10 Omnitrix — Limited Edition Replica',
    description:
      'Ultra-rare collectible replica of the iconic Omnitrix from Ben 10. ' +
      'Die-cast metal casing, light-up LED face, original sound effects. ' +
      'Numbered collector\'s box. Only 500 units ever made worldwide.',
    imageUrl:
      'https://images.unsplash.com/photo-1608889175638-9322300c46e8?w=900&auto=format&fit=crop&q=85',
    startTime:    hoursFromNow(4),
    endTime:      hoursFromNow(28),
    startPrice:   100_000,
    reservePrice: null,
    bidIncrement: 10_000,
    status:       'upcoming',
    currentPrice: 100_000,
    totalBids:    0,
    reserveMet:   true,
  },
  {
    // ③ ENDED — ended 6 hours ago
    title: 'iPhone 15 Pro — Desert Titanium 256GB',
    description:
      'Brand new sealed iPhone 15 Pro 256GB in Desert Titanium. ' +
      'A17 Pro chip, 48MP main camera, titanium frame, Action button. ' +
      'Full Apple warranty. Includes original accessories and box.',
    imageUrl:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=900&auto=format&fit=crop&q=85',
    startTime:    hoursAgo(30),
    endTime:      hoursAgo(6),
    startPrice:   120_000,
    reservePrice: 130_000,
    bidIncrement: 5_000,
    status:       'ended',
    currentPrice: 148_000,
    winningBid:   148_000,
    totalBids:    12,
    reserveMet:   true,
  },
]

// ─────────────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔═══════════════════════════════════════╗')
  console.log('║   THE RISER — Demo Seed Script        ║')
  console.log('╚═══════════════════════════════════════╝\n')

  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ MongoDB Atlas connected\n')

  // ── Step 1: Patch ALL existing users to 1 Crore ──────────
  const updateResult = await User.updateMany({}, { $set: { credits: ONE_CRORE } })
  console.log(`💰 Patched ${updateResult.modifiedCount} existing user(s) → ₹1,00,00,000 credits each\n`)

  // ── Step 2: Wipe old demo accounts ───────────────────────
  const demoEmails = [
    'admin@theriser.com',
    'aditya@theriser.com',
    'abhishek@theriser.com',
    'alok@theriser.com',
  ]
  await User.deleteMany({ email: { $in: demoEmails } })

  // ── Step 3: Create admin (password hashed via pre-save) ──
  const admin = await User.create({
    name:     'The Riser Admin',
    email:    'admin@theriser.com',
    password: 'admin123',
    role:     'admin',
    credits:  ONE_CRORE,
  })
  console.log('👑 Admin account:')
  console.log(`   ${admin.email}  /  admin123\n`)

  // ── Step 4: Create bidders (hash passwords manually for insertMany)
  const hashedPw = await bcrypt.hash('bidder123', 12)
  const bidderDocs = [
    { name: 'Aditya Das',   email: 'aditya@theriser.com',   role: 'bidder', credits: ONE_CRORE, password: hashedPw },
    { name: 'Abhishek Raj', email: 'abhishek@theriser.com', role: 'bidder', credits: ONE_CRORE, password: hashedPw },
    { name: 'Alok Kumar',   email: 'alok@theriser.com',     role: 'bidder', credits: ONE_CRORE, password: hashedPw },
  ]
  const bidders = await User.insertMany(bidderDocs)
  console.log('👥 Bidder accounts (all with ₹1 Crore credits):')
  bidders.forEach(b => console.log(`   ${b.email}  /  bidder123`))
  console.log()

  // ── Step 5: Wipe old seeded auctions ─────────────────────
  await Auction.deleteMany({ title: { $in: AUCTION_ITEMS.map(a => a.title) } })

  // ── Step 6: Insert auction items ─────────────────────────
  console.log('🏷️  Seeding auctions...\n')

  for (let i = 0; i < AUCTION_ITEMS.length; i++) {
    const item = AUCTION_ITEMS[i]

    // Ended auction: Aditya won, Abhishek was current winner during auction
    const isEnded   = item.status === 'ended'
    const isActive  = item.status === 'active'

    const doc = {
      ...item,
      createdBy:     admin._id,
      currentWinner: isActive ? bidders[1]._id : (isEnded ? bidders[0]._id : null),
      winner:        isEnded  ? bidders[0]._id : null,
    }

    const auction = await Auction.create(doc)

    const icon = { active: '🟢', upcoming: '🟡', ended: '🔴' }[item.status]
    console.log(`${icon} ${item.title}`)
    console.log(`   Status : ${item.status.toUpperCase()}`)
    console.log(`   Price  : ₹${item.currentPrice.toLocaleString('en-IN')}`)
    console.log(`   Bids   : ${item.totalBids}`)
    if (isEnded)   console.log(`   Winner : ${bidders[0].name}`)
    if (isActive)  console.log(`   Leading: ${bidders[1].name}`)
    console.log()
  }

  // ── Final summary ─────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════')
  console.log('  ✅  SEED COMPLETE — THE RISER IS READY FOR DEMO')
  console.log('═══════════════════════════════════════════════════════')
  console.log()
  console.log('  ADMIN LOGIN')
  console.log('    admin@theriser.com          /  admin123')
  console.log()
  console.log('  BIDDER LOGINS  (₹1,00,00,000 each)')
  console.log('    aditya@theriser.com         /  bidder123')
  console.log('    abhishek@theriser.com       /  bidder123')
  console.log('    alok@theriser.com           /  bidder123')
  console.log()
  console.log('  AUCTIONS')
  console.log('    🟢 Louis Vuitton Purse      →  ACTIVE   (ends in 3h)')
  console.log('    🟡 Ben 10 Omnitrix          →  UPCOMING (starts in 4h)')
  console.log('    🔴 iPhone 15 Pro            →  ENDED    (won by Aditya)')
  console.log('═══════════════════════════════════════════════════════\n')

  await mongoose.disconnect()
}

seed().catch(err => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
