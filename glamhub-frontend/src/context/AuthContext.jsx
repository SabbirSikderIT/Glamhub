import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const KEY = 'glamhub_auth'
const AuthContext = createContext(null)

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(read)

  const login = useCallback((auth) => {
    try { localStorage.setItem(KEY, JSON.stringify(auth)) } catch { /* private mode */ }
    setUser(auth)
  }, [])

  const logout = useCallback(() => {
    try { localStorage.removeItem(KEY) } catch { /* private mode */ }
    setUser(null)
  }, [])

  // Keep name / photo fresh after profile edits without a new login.
  const patch = useCallback((fields) => {
    setUser((cur) => {
      if (!cur) return cur
      const next = { ...cur, ...fields }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const value = useMemo(() => ({ user, login, logout, patch }), [user, login, logout, patch])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function homePathFor(user) {
  if (!user) return '/login'
  if (user.role === 'ARTIST') return '/dashboard'
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') return '/admin'
  return '/account'
}
