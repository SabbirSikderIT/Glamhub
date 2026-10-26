import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { homePathFor, useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { AiSparkIcon } from './Icons.jsx'

const linkCls = ({ isActive }) => `pill link-anim !text-sm ${isActive ? 'pill-active' : ''}`

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  const areaLabel = user?.role === 'ARTIST' ? 'My dashboard' : user?.role === 'CUSTOMER' ? 'My account' : 'Admin panel'

  const links = (
    <>
      <button type="button" className="pill link-anim !text-sm" onClick={() => window.dispatchEvent(new Event('open-chat-widget'))} aria-label="Open the quick AI helper" title="Quick AI helper">
        <AiSparkIcon className="h-4 w-4 text-accent" />
      </button>
      <NavLink to="/speak" className={linkCls}>Speak with AI</NavLink>
      <NavLink to="/chat" className={linkCls}>Chat with AI</NavLink>
      <NavLink to="/suggestions" className={linkCls}>Suggestions</NavLink>
      <NavLink to="/search" className={linkCls}>Find a makeup artist</NavLink>
      <NavLink to="/faq" className={linkCls}>FAQs</NavLink>
      {!user ? (
        <>
          <NavLink to="/admin/login" className={linkCls}>Admin portal</NavLink>
          <NavLink to="/register" className={linkCls}>Join as artist</NavLink>
          <NavLink to="/login" className="pill pill-primary !text-sm">Log in</NavLink>
        </>
      ) : (
        <>
          <Link to={homePathFor(user)} className="pill pill-primary !text-sm">{areaLabel}</Link>
          <button type="button" className="pill !text-sm" onClick={logout}>Log out</button>
        </>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
        <Logo />
        {/* inline capsule from 900px up */}
        <nav className="hidden flex-wrap items-center justify-end gap-1.5 rounded-full border border-border bg-surface/90 px-4 py-2.5 shadow-card backdrop-blur min-[900px]:flex" aria-label="Main">
          {links}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 min-[900px]:hidden">
          <ThemeToggle />
          <button type="button" className="pill !px-3" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="card mx-auto mt-2 flex max-w-md flex-col gap-2 p-4 min-[900px]:hidden [&_.pill]:w-full" aria-label="Mobile">
          {links}
        </nav>
      )}
    </header>
  )
}
