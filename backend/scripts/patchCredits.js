// backend/scripts/patchCredits.js
// ─────────────────────────────────────────────────────────────
// One-time migration: set ALL existing users' credits to 1 Crore
//
// Usage:
//   cd backend
//   node scripts/patchCredits.js
// ─────────────────────────────────────────────────────────────

require('dotenv').config({ path: '../.env' })
const mongoose = require('mongoose')
const User     = require('../models/User')

const ONE_CRORE = 10_000_000  // 1,00,00,000

async function patch() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('✅ MongoDB connected')

  const result = await User.updateMany(
    {},                              // all users
    { $set: { credits: ONE_CRORE } }
  )

  console.log(`\n💰 Updated ${result.modifiedCount} user(s):`)
  console.log(`   Each user now has ₹${ONE_CRORE.toLocaleString('en-IN')} credits\n`)

  // Show updated list
  const users = await User.find({}).select('name email role credits')
  users.forEach(u => {
    const icon = u.role === 'admin' ? '👑' : '👤'
    console.log(`  ${icon} ${u.name.padEnd(20)} ${u.email.padEnd(30)} ₹${u.credits.toLocaleString('en-IN')}`)
  })

  console.log('\n✅ Done.\n')
  await mongoose.disconnect()
}

patch().catch(err => {
  console.error('❌ Failed:', err.message)
  process.exit(1)
})
