import { createContext, useContext, useEffect, useState } from 'react'
import SidebarLayout from '../../components/SidebarLayout.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

const MainAdminContext = createContext(false)
export const useMainAdmin = () => useContext(MainAdminContext)

export default function AdminLayout() {
  const { user } = useAuth()
  const [main, setMain] = useState(!!user.mainAdmin)
  useEffect(() => { setMain(!!user.mainAdmin) }, [user.mainAdmin])

  const links = [
    { to: '/admin/overview', label: 'Overview', icon: '📊' },
    { to: '/admin/reviews', label: 'Review moderation', icon: '⭐' },
    { to: '/admin/photos', label: 'Photo moderation', icon: '🖼' },
    { to: '/admin/palettes', label: 'Colour palettes', icon: '🎨' },
    { to: '/admin/looks', label: 'Makeup looks', icon: '💄' },
    { to: '/admin/users', label: 'User management', icon: '👥' },
    { to: '/admin/deletion-requests', label: 'Delete account requests', icon: '🗑' },
    ...(main ? [
      { to: '/admin/manage-admins', label: 'Manage admins', icon: '🛡' },
      { to: '/admin/manage-moderators', label: 'Manage moderators', icon: '🧑‍⚖️' },
      { to: '/admin/blue-badge', label: 'Blue badge', icon: '✔️' },
      { to: '/admin/booking-money', label: 'Booking money', icon: '💰' },
    ] : []),
  ]
  return (
    <MainAdminContext.Provider value={main}>
      <SidebarLayout title={main ? 'Main admin' : user.role === 'ADMIN' ? 'Admin' : 'Moderator'} user={user} links={links} />
    </MainAdminContext.Provider>
  )
}
