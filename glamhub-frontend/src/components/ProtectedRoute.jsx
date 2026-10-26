import { Navigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../context/AuthContext.jsx'

/** requiredRole: a role string or an array of roles. */
export default function ProtectedRoute({ requiredRole, children }) {
  const { user } = useAuth()
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  if (!user) return <Navigate to={roles.includes('ADMIN') ? '/admin/login' : '/login'} replace />
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />
  return children
}
