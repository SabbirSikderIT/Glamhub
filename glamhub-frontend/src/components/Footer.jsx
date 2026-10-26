import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { TEAM } from '../data/team.js'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/70">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-12">
        <section aria-labelledby="credits-heading" className="mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Credits</p>
          <h2 id="credits-heading" className="mb-6 mt-1 text-3xl font-bold">Made with love by the <span className="text-brand">GlamHub team</span></h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TEAM.map((t) => (
              <div key={t.role} className="card card-hover p-4">
                <div className="mb-1 text-3xl">{t.emoji}</div>
                <p className="font-display font-semibold">{t.name}</p>
                <p className="text-sm text-ink-muted">{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
          <div>
            <Logo />
            <p className="mt-2 max-w-xs text-sm text-ink-muted">Find, book and love your makeup artist across Bangladesh.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold" aria-label="Footer">
            <Link to="/search" className="link-anim text-ink no-underline">Find an artist</Link>
            <Link to="/suggestions" className="link-anim text-ink no-underline">Suggestions</Link>
            <Link to="/faq" className="link-anim text-ink no-underline">FAQs</Link>
            <Link to="/register" className="link-anim text-ink no-underline">Join as artist</Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-sm text-ink-muted">© {new Date().getFullYear()} GlamHub · Questions? Ask our AI assistant or write to support@glamhub.com</p>
      </div>
    </footer>
  )
}
