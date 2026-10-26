import { Link } from 'react-router-dom'

export default function Logo({ to = '/', className = '' }) {
  return (
    <Link to={to} className={`flex items-center gap-2 no-underline ${className}`} aria-label="GlamHub home">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f58bb4" />
            <stop offset="1" stopColor="#c13a78" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="url(#lg)" />
        <path d="M24 14h16v14c0 4-3 7-8 7s-8-3-8-7z" fill="#fff" />
        <rect x="28" y="35" width="8" height="15" rx="2" fill="#fff" opacity=".85" />
        <circle cx="47" cy="18" r="3" fill="#ffe3a3" />
      </svg>
      <span className="font-display text-2xl font-bold text-ink">Glam<span className="text-brand">Hub</span></span>
    </Link>
  )
}
