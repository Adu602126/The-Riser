// App.jsx — The Riser
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import CustomCursor from './components/common/CustomCursor'
import MatrixRain   from './components/common/MatrixRain'

// Pages
import LandingPage      from './pages/LandingPage'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import AdminDashboard   from './pages/AdminDashboard'
import CreateAuction    from './pages/CreateAuction'
import EditAuction      from './pages/EditAuction'
import ManageCredits    from './pages/ManageCredits'
import AdminBidFeed     from './pages/AdminBidFeed'
import BidderAuctions   from './pages/BidderAuctions'
import AuctionDetail    from './pages/AuctionDetail'
import BidderDashboard  from './pages/BidderDashboard'
import WonItems              from './pages/WonItems'
import SubmitAuction         from './pages/SubmitAuction'
import MySubmissions         from './pages/MySubmissions'
import AdminPendingApprovals from './pages/AdminPendingApprovals'

// Route guards
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-cyber-black"
      style={{ position: 'relative', overflow: 'hidden' }}>
      <MatrixRain opacity={0.3} color="#00f5ff" fontSize={14} speed={1.2} density={0.975} />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div className="font-display text-6xl text-cyber-cyan mb-2 neon-cyan">THE RISER</div>
        <div className="cyber-progress w-48 mx-auto mb-4" />
        <div className="font-mono text-xs text-gray-500 uppercase tracking-widest animate-pulse cursor-blink">
          INITIALIZING SYSTEM
        </div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="scanlines" style={{ position: 'relative' }}>
            {/* ── Global custom cursor ───────────────────── */}
            <CustomCursor />

            {/* ── Subtle global matrix rain (very faint) ─── */}
            <div style={{
              position: 'fixed', inset: 0,
              pointerEvents: 'none', zIndex: 0,
            }}>
              <MatrixRain opacity={0.06} color="#00f5ff" fontSize={13} speed={0.8} density={0.98} />
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#1a1a1a',
                  color: '#e8e8e8',
                  border: '2px solid #2a2a2a',
                  fontFamily: '"Syne", sans-serif',
                  fontSize: '13px',
                  borderRadius: 0,
                },
                success: { iconTheme: { primary: '#00f5ff', secondary: '#0a0a0a' } },
                error:   { iconTheme: { primary: '#ff2d55', secondary: '#fff' } },
              }}
            />
            <Routes>
              {/* Public */}
              <Route path="/"         element={<LandingPage />} />
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
              }/>
              <Route path="/admin/auctions/create" element={
                <ProtectedRoute role="admin"><CreateAuction /></ProtectedRoute>
              }/>
              <Route path="/admin/auctions/:id/edit" element={
                <ProtectedRoute role="admin"><EditAuction /></ProtectedRoute>
              }/>
              <Route path="/admin/credits" element={
                <ProtectedRoute role="admin"><ManageCredits /></ProtectedRoute>
              }/>
              <Route path="/admin/auctions/:id/feed" element={
                <ProtectedRoute role="admin"><AdminBidFeed /></ProtectedRoute>
              }/>
              <Route path="/admin/pending" element={
                <ProtectedRoute role="admin"><AdminPendingApprovals /></ProtectedRoute>
              }/>

              {/* Bidder routes */}
              <Route path="/auctions" element={
                <ProtectedRoute role="bidder"><BidderAuctions /></ProtectedRoute>
              }/>
              <Route path="/auctions/:id" element={
                <ProtectedRoute role="bidder"><AuctionDetail /></ProtectedRoute>
              }/>
              <Route path="/dashboard" element={
                <ProtectedRoute role="bidder"><BidderDashboard /></ProtectedRoute>
              }/>
              <Route path="/won" element={
                <ProtectedRoute role="bidder"><WonItems /></ProtectedRoute>
              }/>
              <Route path="/submit-auction" element={
                <ProtectedRoute role="bidder"><SubmitAuction /></ProtectedRoute>
              }/>
              <Route path="/my-submissions" element={
                <ProtectedRoute role="bidder"><MySubmissions /></ProtectedRoute>
              }/>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
