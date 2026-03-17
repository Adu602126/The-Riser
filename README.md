# 🏆 The Riser — Online Auction Platform
### CodeBidz Hackathon | Unstop | Submission Deadline: March 26, 2026

---

## 👥 Team

| Role | Name |
|------|------|
| **Team Leader** | Aditya Das |
| **Member** | Abhishek Raj |
| **Member** | Alok Kumar |

**Team Name:** The Riser

---

## 🚀 Live Demo

- **Frontend:** `https://the-riser.vercel.app` *(replace with your Vercel URL)*
- **Backend:** `https://the-riser-api.up.railway.app` *(replace with your Railway URL)*

---

## 📋 Overview

**The Riser** is a real-world-inspired online auction platform where admins create item auctions, assign bidding credits to users, and bidders compete in real-time using credits to win items. It simulates eBay-style bidding with fixed credits (no real money), live WebSocket updates, and a unique **BidPulse** auto-bid + streak reward system.

---

## ✨ Features

### Admin Panel
- ✅ Create, edit, delete auction listings (title, description, image via Cloudinary, timers, reserve price, bid increments)
- ✅ Assign / manage credits to registered bidders (top-up, deduct, view balance)
- ✅ Monitor live bids in real-time per auction
- ✅ One-click declare winner & close auction with automatic notification
- ✅ Bidding reports, history, and basic analytics

### Bidder Panel
- ✅ Secure registration / login (JWT + bcrypt)
- ✅ Google OAuth (optional, bonus)
- ✅ Browse active auctions with filters/search + live countdown timers
- ✅ Place bids using credits (instant validation)
- ✅ Outbid notifications via WebSockets (in-app)
- ✅ Track credit balance and bidding history
- ✅ View won items history

### Credits System
- ✅ Admin assigns credits per bidder
- ✅ Outbid → credits instantly refunded
- ✅ Only winner is deducted on auction close

### 🔥 BidPulse — Smart Auto-Bidding + Streak Rewards
- ✅ Set a max budget → system auto-places minimum-increment bids when outbid
- ✅ Every 5 consecutive bids → BidCoin bonus added to wallet
- ✅ Max-budget cap enforced 100% server-side
- ✅ In-memory streak counter (Redis-ready)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite, Tailwind CSS, Framer Motion |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt |
| Images | Cloudinary |
| Deploy Frontend | Vercel |
| Deploy Backend | Railway |
| Cache/Streaks | In-memory Map (Redis-compatible interface) |

---

## ⚙️ Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/theriser
JWT_SECRET=your_super_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
ADMIN_REGISTRATION_SECRET=admin_secret_key_2024
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Installation & Run

```bash
# 1. Clone the repo
git clone https://github.com/your-team/the-riser.git
cd the-riser

# 2. Install backend dependencies
cd backend
npm install
npm run dev   # starts on :5000

# 3. Install frontend dependencies (new terminal)
cd ../frontend
npm install
npm run dev   # starts on :5173
```

### Deployment

```bash
# Backend → Railway
railway login
railway init
railway up

# Frontend → Vercel
vercel login
vercel --prod
```

---

## ⚠️ Known Limitations

- No real payment gateway (credits are virtual, assigned by admin only)
- Streak counter uses in-memory Map (data resets on server restart; Redis integration is plug-and-play)
- Google OAuth is optional/bonus — core auth is JWT
- Image uploads require Cloudinary credentials
- No email notifications (in-app WebSocket only)
- Mobile responsive (tested on common breakpoints; not native app)

---

## 🎬 Demo Script (5-min Video)

1. **[0:00–0:30]** Intro — Show the neo-brutalist UI, explain The Riser in one sentence
2. **[0:30–1:30]** Admin flow — Login → Create an auction → Upload image → Set timer → Assign credits to a bidder
3. **[1:30–2:30]** Bidder flow — Login as bidder → Browse auctions → View live countdown → Place a manual bid
4. **[2:30–3:30]** BidPulse demo — Set auto-bid max budget → Get outbid → Watch auto-bid fire → Show streak counter → BidCoin reward
5. **[3:30–4:30]** Real-time demo — Two browser windows, bid from one → other shows outbid notification instantly → credits returned
6. **[4:30–5:00]** Admin declares winner → Winner sees item in history → Analytics dashboard

---

## 🏗 Architecture

```
the-riser/
├── backend/
│   ├── models/          # Mongoose schemas (User, Auction, Bid, CreditLog)
│   ├── routes/          # Express REST endpoints
│   ├── middleware/       # JWT auth, role guards
│   ├── socket/          # Socket.io event handlers + BidPulse engine
│   └── utils/           # Cloudinary, streak counter, helpers
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── admin/   # AdminDashboard, CreateAuction, BidFeed, etc.
│       │   ├── bidder/  # AuctionList, AuctionDetail, BidPulse modal, etc.
│       │   └── common/  # Navbar, Timer, CreditsBar, etc.
│       ├── pages/       # Route-level pages
│       ├── hooks/       # useSocket, useCountdown, useCredits
│       └── context/     # AuthContext, SocketContext
└── README.md
```
