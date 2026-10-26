import { NavLink, Outlet } from 'react-router-dom'
import { Avatar } from './ArtistCard.jsx'

/** Shared shell for the artist dashboard and the admin panel. links: [{ to, label, icon, badge?, end? }] */
export default function SidebarLayout({ title, user, links }) {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[250px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={user.name} url={user.profilePhotoUrl} size="h-12 w-12 text-base" />
            <div className="min-w-0">
              <p className="truncate font-display font-bold">{user.name}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-accent">{title}</p>
            </div>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible" aria-label={title}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `pill link-anim !justify-start !px-4 !py-2 !text-sm ${isActive ? 'pill-active' : ''}`}>
                <span aria-hidden="true">{l.icon}</span> {l.label}
                {l.badge > 0 && <span className="ml-auto rounded-full bg-[#d6455d] px-2 text-xs font-bold text-white">{l.badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  )
}
