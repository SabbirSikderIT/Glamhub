import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar } from '../components/ArtistCard.jsx'
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx'
import { BlueCheckIcon } from '../components/Icons.jsx'
import { Empty, ErrorBox, Loading, StarRating } from '../components/Widgets.jsx'
import { BUDGETS, CATEGORIES, money, prettyDate } from '../utils/format.js'
import {
  errorMessage, getArtist, getArtistAvailability, getArtistPackages, getArtistPortfolio, getArtistReviews,
} from '../services/api.js'

export default function ArtistProfile() {
  const { id } = useParams()
  const [artist, setArtist] = useState(null)
  const [portfolio, setPortfolio] = useState([])
  const [packages, setPackages] = useState([])
  const [reviews, setReviews] = useState([])
  const [availability, setAvailability] = useState({})
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [shown, setShown] = useState(6)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    Promise.all([getArtist(id), getArtistPortfolio(id), getArtistPackages(id), getArtistReviews(id)])
      .then(([a, p, k, r]) => {
        if (cancelled) return
        setArtist(a); setPortfolio(p); setPackages(k); setReviews(r); setState('ready')
      })
      .catch((e) => { if (!cancelled) { setError(errorMessage(e)); setState('error') } })
    return () => { cancelled = true }
  }, [id])

  const loadMonth = (month) => {
    const from = new Date(month.getFullYear(), month.getMonth(), 1)
    const to = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    getArtistAvailability(id, f(from), f(to)).then((list) => setAvailability((cur) => ({ ...cur, ...Object.fromEntries(list.map((a) => [a.date, a.status])) }))).catch(() => {})
  }
  useEffect(() => { const d = new Date(); loadMonth(new Date(d.getFullYear(), d.getMonth(), 1)) /* eslint-disable-next-line */ }, [id])

  const visible = useMemo(() => (filter ? portfolio.filter((p) => p.category === filter) : portfolio), [portfolio, filter])

  if (state === 'loading') return <Loading label="Loading profile…" />
  if (state === 'error') return <ErrorBox message={error} />
  const budget = BUDGETS[artist.budgetTier]

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-12">
      <section className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <Avatar name={artist.name} url={artist.profilePhotoUrl} size="h-28 w-28 text-4xl" />
        <div className="flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-3xl font-bold">{artist.name} {artist.hasBlueBadge && <BlueCheckIcon className="h-7 w-7" />}</h1>
          <p className="text-ink-muted">📍 {artist.location}{artist.yearsExperience > 0 && ` · ${artist.yearsExperience} years of experience`}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StarRating value={artist.ratingAvg} size="h-5 w-5" />
            <span className="text-sm text-ink-muted">{artist.totalReviews ? `${artist.ratingAvg.toFixed(1)} · ${artist.totalReviews} review${artist.totalReviews > 1 ? 's' : ''}` : 'No reviews yet'}</span>
            {budget && <span className={`chip ${budget.tint}`}>{budget.label}</span>}
            {artist.verified && <span className="chip bg-[#e6f6ee] text-[#2f7d5b]">✓ Verified by GlamHub</span>}
          </div>
          {artist.bio && <p className="mt-3 max-w-2xl text-ink">{artist.bio}</p>}
        </div>
        <Link to={`/book/${artist.id}`} className="pill pill-primary !px-8 !py-3 text-base">Book now</Link>
      </section>

      <section className="mt-10" aria-labelledby="pf">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="pf" className="text-2xl font-bold">Portfolio</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`pill !py-1 ${!filter ? 'pill-active' : ''}`} onClick={() => setFilter('')}>All</button>
            {Object.entries(CATEGORIES).map(([k, l]) => <button key={k} type="button" className={`pill !py-1 ${filter === k ? 'pill-active' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
        </div>
        {visible.length === 0 ? <Empty emoji="📸" title="No photos here yet">This artist hasn't published any photos{filter ? ' in this category' : ''} yet.</Empty> : (
          <div className="columns-2 gap-3 md:columns-3">
            {visible.map((p) => (
              <button key={p.id} type="button" onClick={() => setLightbox(p)} className="mb-3 block w-full overflow-hidden rounded-2xl">
                <img src={p.imageUrl} alt={p.caption || `${CATEGORIES[p.category]} makeup by ${artist.name}`} className="w-full transition-transform duration-500 hover:scale-105" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="pk">
        <h2 id="pk" className="mb-4 text-2xl font-bold">Packages</h2>
        {packages.length === 0 ? <Empty emoji="🎀" title="No packages yet">This artist hasn't added packages yet.</Empty> : (
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((k) => (
              <div key={k.id} className="card card-hover flex flex-col p-5">
                <h3 className="text-xl font-semibold">{k.title}</h3>
                <p className="text-2xl font-bold text-accent">{money(k.price)}</p>
                <p className="text-sm text-ink-muted">{k.durationHours} hour{k.durationHours > 1 ? 's' : ''}</p>
                {k.description && <p className="mt-2 text-sm">{k.description}</p>}
                {k.includes && <p className="mt-2 text-sm text-ink-muted">✨ {k.includes}</p>}
                <Link to={`/book/${artist.id}?package=${k.id}`} className="pill pill-primary mt-auto self-start">Book this</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[360px_1fr]" aria-labelledby="av">
        <div>
          <h2 id="av" className="mb-4 text-2xl font-bold">Availability</h2>
          <AvailabilityCalendar statuses={availability} onMonthChange={loadMonth} />
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">Reviews</h2>
          {reviews.length === 0 ? <Empty emoji="💬" title="No reviews yet">Be the first to book and share your experience.</Empty> : (
            <div className="space-y-3">
              {reviews.slice(0, shown).map((r) => (
                <article key={r.id} className="card p-4">
                  <div className="flex items-center justify-between"><strong>{r.clientName}</strong><StarRating value={r.rating} /></div>
                  {r.comment && <p className="mt-1">{r.comment}</p>}
                  <p className="mt-1 text-xs text-ink-muted">{prettyDate(r.createdAt?.slice(0, 10))}</p>
                  {r.artistReply && <p className="mt-2 rounded-xl bg-surface-raised p-3 text-sm"><strong>Reply from {artist.name}:</strong> {r.artistReply}</p>}
                </article>
              ))}
              {reviews.length > shown && <button type="button" className="pill" onClick={() => setShown((s) => s + 6)}>Show more reviews</button>}
            </div>
          )}
        </div>
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <img src={lightbox.imageUrl} alt={lightbox.caption || ''} className="max-h-[90vh] max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  )
}
