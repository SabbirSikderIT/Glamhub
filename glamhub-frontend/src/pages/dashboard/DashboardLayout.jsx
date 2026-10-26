import { useEffect, useState } from 'react'
import SidebarLayout from '../../components/SidebarLayout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getAccount, getArtistBookings } from '../../services/api.js'

export default function DashboardLayout() {
  const { user, patch } = useAuth()
  const [pending, setPending] = useState(0)

  // Poll so the pending-approval badge and avatar stay fresh.
  useEffect(() => {
    let live = true
    const tick = () => {
      getArtistBookings().then((b) => live && setPending(b.filter((x) => x.status === 'PENDING').length)).catch(() => {})
      getAccount().then((a) => live && a.profilePhotoUrl !== user.profilePhotoUrl && patch({ profilePhotoUrl: a.profilePhotoUrl })).catch(() => {})
    }
    tick()
    const t = setInterval(tick, 20000)
    return () => { live = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const links = [
    { to: '/dashboard', label: 'Overview', icon: '🏠', end: true },
    { to: '/dashboard/portfolio', label: 'Portfolio', icon: '📸' },
    { to: '/dashboard/calendar', label: 'Calendar', icon: '🗓' },
    { to: '/dashboard/packages', label: 'Packages', icon: '🎀' },
    { to: '/dashboard/bookings', label: 'Bookings', icon: '💌', badge: pending },
    { to: '/dashboard/reviews', label: 'Feedback', icon: '💬' },
    { to: '/dashboard/profile', label: 'Profile settings', icon: '👤' },
    { to: '/dashboard/verified-badge', label: 'Verified badge', icon: '✔️' },
    { to: '/dashboard/delete-account', label: 'Delete account', icon: '🗑' },
  ]
  return <SidebarLayout title="Artist dashboard" user={user} links={links} />
}
