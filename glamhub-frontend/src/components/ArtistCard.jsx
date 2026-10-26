import { Link } from 'react-router-dom'
import { BlueCheckIcon } from './Icons.jsx'
import { StarRating } from './Widgets.jsx'
import { BUDGETS, initials, money } from '../utils/format.js'

export function Avatar({ name, url, size = 'h-16 w-16 text-xl' }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-full object-cover ring-2 ring-border`} />
  ) : (
    <span className={`${size} flex items-center justify-center rounded-full bg-brand font-display font-bold`} aria-hidden="true">{initials(name)}</span>
  )
}

export default function ArtistCard({ artist }) {
  const budget = BUDGETS[artist.budgetTier]
  return (
    <Link to={`/artists/${artist.id}`} className="card card-hover block p-5 text-ink no-underline">
      <div className="flex items-center gap-4">
        <Avatar name={artist.name} url={artist.profilePhotoUrl} />
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 truncate text-lg font-semibold">
            {artist.name} {artist.hasBlueBadge && <BlueCheckIcon className="h-5 w-5 shrink-0" />}
          </h3>
          <p className="truncate text-sm text-ink-muted">📍 {artist.location || 'Bangladesh'}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <StarRating value={artist.ratingAvg} />
        <span className="text-ink-muted">{artist.totalReviews ? `${artist.ratingAvg.toFixed(1)} (${artist.totalReviews})` : 'New'}</span>
      </div>
      {artist.bio && <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{artist.bio}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {budget && <span className={`chip ${budget.tint}`}>{budget.label}</span>}
        {artist.minPrice != null && <span className="chip bg-[#f3ecfd] text-[#5b3fb5]">from {money(artist.minPrice)}</span>}
        {artist.yearsExperience > 0 && <span className="chip bg-border text-ink">{artist.yearsExperience} yrs</span>}
      </div>
    </Link>
  )
}
