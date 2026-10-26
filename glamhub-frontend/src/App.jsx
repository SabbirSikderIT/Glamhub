import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import FloatingAssistants from './components/FloatingAssistants.jsx'
import { Loading } from './components/Widgets.jsx'
import Home from './pages/Home.jsx'
import SearchResults from './pages/SearchResults.jsx'
import { AdminLogin, ForgotPassword, Login, NotFound, RegisterArtist, RegisterUser } from './pages/AuthPages.jsx'

const ArtistProfile = lazy(() => import('./pages/ArtistProfile.jsx'))
const BookingFlow = lazy(() => import('./pages/BookingFlow.jsx'))
const VerifyBooking = lazy(() => import('./pages/VerifyBooking.jsx'))
const Suggestions = lazy(() => import('./pages/Suggestions.jsx'))
const Chat = lazy(() => import('./pages/Chat.jsx'))
const Speak = lazy(() => import('./pages/Speak.jsx'))
const FAQ = lazy(() => import('./pages/FAQ.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const DashboardLayout = lazy(() => import('./pages/dashboard/DashboardLayout.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const dash = (name) => lazy(() => import('./pages/dashboard/DashboardPages.jsx').then((m) => ({ default: m[name] })))
const adm = (name) => lazy(() => import('./pages/admin/AdminPages.jsx').then((m) => ({ default: m[name] })))
const DashOverview = dash('DashOverview'), DashPortfolio = dash('DashPortfolio'), DashCalendar = dash('DashCalendar'), DashPackages = dash('DashPackages')
const DashBookings = dash('DashBookings'), DashReviews = dash('DashReviews'), DashProfile = dash('DashProfile'), DashBadge = dash('DashBadge'), DashDelete = dash('DashDelete')
const AdminOverview = adm('AdminOverview'), AdminReviews = adm('AdminReviews'), AdminPhotos = adm('AdminPhotos'), AdminPalettes = adm('AdminPalettes')
const AdminLooks = adm('AdminLooks'), AdminUsers = adm('AdminUsers'), AdminDeletionRequests = adm('AdminDeletionRequests')
const AdminManageAdmins = adm('AdminManageAdmins'), AdminManageModerators = adm('AdminManageModerators'), AdminBlueBadge = adm('AdminBlueBadge'), AdminBookingMoney = adm('AdminBookingMoney')

function PublicShell() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Navbar />
      <main className="flex-1"><Suspense fallback={<Loading />}><Outlet /></Suspense></main>
      <Footer />
      <FloatingAssistants />
    </div>
  )
}

/** Dashboard / admin shell: role-guarded, with the sidebar layout inside. */
function Area({ role, Layout }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />
      <ProtectedRoute requiredRole={role}>
        <Suspense fallback={<Loading />}><Layout /></Suspense>
      </ProtectedRoute>
      <FloatingAssistants />
    </div>
  )
}

/** A little sparkle burst on every click of a link or button. */
function useClickBurst() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const onClick = (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('a, button, .pill')) return
      for (let i = 0; i < 5; i++) {
        const s = document.createElement('span')
        s.className = 'heart-pop'
        s.textContent = ['💖', '✨', '💗', '🌸', '💫'][i % 5]
        s.style.left = `${e.clientX - 8}px`
        s.style.top = `${e.clientY - 8}px`
        s.style.fontSize = `${10 + Math.random() * 8}px`
        s.style.setProperty('--dx', `${(i - 2) * 16 + Math.random() * 10}px`)
        s.style.animationDelay = `${i * 30}ms`
        document.body.appendChild(s)
        setTimeout(() => s.remove(), 1100)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}

export default function App() {
  useClickBurst()
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/artists/:id" element={<ArtistProfile />} />
        <Route path="/book/:artistId" element={<BookingFlow />} />
        <Route path="/verify-booking/:token" element={<VerifyBooking />} />
        <Route path="/suggestions" element={<Suggestions />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/speak" element={<Speak />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<RegisterArtist />} />
        <Route path="/register/user" element={<RegisterUser />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/account" element={<ProtectedRoute requiredRole="CUSTOMER"><Account /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<Area role="ARTIST" Layout={DashboardLayout} />}>
        <Route path="/dashboard" element={<DashOverview />} />
        <Route path="/dashboard/portfolio" element={<DashPortfolio />} />
        <Route path="/dashboard/calendar" element={<DashCalendar />} />
        <Route path="/dashboard/packages" element={<DashPackages />} />
        <Route path="/dashboard/bookings" element={<DashBookings />} />
        <Route path="/dashboard/reviews" element={<DashReviews />} />
        <Route path="/dashboard/profile" element={<DashProfile />} />
        <Route path="/dashboard/verified-badge" element={<DashBadge />} />
        <Route path="/dashboard/delete-account" element={<DashDelete />} />
      </Route>

      <Route element={<Area role={['ADMIN', 'MODERATOR']} Layout={AdminLayout} />}>
        <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
        <Route path="/admin/overview" element={<AdminOverview />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/photos" element={<AdminPhotos />} />
        <Route path="/admin/palettes" element={<AdminPalettes />} />
        <Route path="/admin/looks" element={<AdminLooks />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/deletion-requests" element={<AdminDeletionRequests />} />
        <Route path="/admin/manage-admins" element={<AdminManageAdmins />} />
        <Route path="/admin/manage-moderators" element={<AdminManageModerators />} />
        <Route path="/admin/blue-badge" element={<AdminBlueBadge />} />
        <Route path="/admin/booking-money" element={<AdminBookingMoney />} />
      </Route>
    </Routes>
  )
}
