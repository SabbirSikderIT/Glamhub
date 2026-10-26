import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HeroArt from '../components/HeroArt.jsx'
import PhotoFlipBook from '../components/PhotoFlipBook.jsx'
import ProcessAnimation from '../components/ProcessAnimation.jsx'
import ArtistCard from '../components/ArtistCard.jsx'
import { LOOK_PRESETS } from '../components/FaceArt.jsx'
import { Sparkle } from '../components/Icons.jsx'
import { BUDGETS, CATEGORIES } from '../utils/format.js'
import { getDistricts, getShowcase, searchArtists } from '../services/api.js'

export default function Home() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('')
  const [budget, setBudget] = useState('')
  const [districts, setDistricts] = useState({})
  const [showcase, setShowcase] = useState([])
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    getDistricts().then(setDistricts).catch(() => {})
    getShowcase(10).then(setShowcase).catch(() => {})
    searchArtists({ size: 6 }).then((r) => setFeatured(r.items)).catch(() => {})
  }, [])

  const submit = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (district) p.set('district', district)
    if (budget) p.set('budget', budget)
    nav(`/search?${p}`)
  }

  // Real, screened portfolio photos are mixed in with the illustrated looks.
  const slides = useMemo(() => {
    const art = Object.entries(LOOK_PRESETS).map(([preset, p]) => ({ type: 'art', preset, caption: p.label }))
    const photos = showcase.map((s) => ({ type: 'photo', url: s.imageUrl, caption: s.caption || `${CATEGORIES[s.category] || 'Makeup'} look`, artist: s.artistName }))
    const out = []
    for (let i = 0; i < Math.max(art.length, photos.length); i++) {
      if (art[i]) out.push(art[i])
      if (photos[i]) out.push(photos[i])
    }
    return out
  }, [showcase])

  return (
    <div>
      {/* hero */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 pb-10 pt-8 sm:px-12 md:grid-cols-2 md:pt-14">
        <div className="anim-rise">
          <span className="chip mb-4 bg-[#f3ecfd] text-[#5b3fb5]"><Sparkle className="h-3 w-3" /> Verified makeup artists across Bangladesh</span>
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">Your glow-up, <span className="text-brand">booked beautifully</span></h1>
          <p className="mt-4 max-w-md text-lg text-ink-muted">Find a makeup artist you love in your district, compare budgets, check real availability and book in minutes.</p>

          <form onSubmit={submit} className="card mt-7 space-y-3 p-4" role="search">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" placeholder="Search by artist name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Artist name" />
              <select className="field" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District">
                <option value="">Any district</option>
                {Object.entries(districts).map(([division, list]) => (
                  <optgroup key={division} label={division}>{list.map((d) => <option key={d}>{d}</option>)}</optgroup>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`pill !py-1.5 ${budget === '' ? 'pill-active' : ''}`} onClick={() => setBudget('')}>Any budget</button>
              {Object.entries(BUDGETS).map(([k, b]) => (
                <button key={k} type="button" className={`pill !py-1.5 ${budget === k ? 'pill-active' : ''}`} onClick={() => setBudget(k)}>{b.short}</button>
              ))}
              <button type="submit" className="pill pill-primary ml-auto">Find my artist</button>
            </div>
          </form>
        </div>
        <HeroArt className="mx-auto w-full max-w-xl" />
      </section>

      {/* budget categories */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-12" aria-labelledby="budget-h">
        <h2 id="budget-h" className="mb-1 text-center text-3xl font-bold">Pick a budget that feels right</h2>
        <p className="mb-6 text-center text-ink-muted">Every artist chooses a budget tier, so you can browse exactly what suits you.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[['LOW', '🌸', 'Natural everyday looks, perfect for college, office and small events.'], ['MEDIUM', '💖', 'Polished soft-glam for engagements, holud and parties.'], ['HIGH', '👑', 'Premium bridal and editorial artistry with luxury products.']].map(([k, e, t]) => (
            <Link key={k} to={`/search?budget=${k}`} className="card card-hover p-6 text-center text-ink no-underline">
              <div className="mb-2 text-4xl">{e}</div>
              <h3 className="text-xl font-semibold">{BUDGETS[k].label}</h3>
              <p className="text-sm font-bold text-accent">{BUDGETS[k].hint}</p>
              <p className="mt-2 text-sm text-ink-muted">{t}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* looks animation */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 sm:px-12 md:grid-cols-2" aria-labelledby="looks-h">
        <div className="mx-auto w-full max-w-md"><PhotoFlipBook slides={slides} /></div>
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Looks we love</p>
          <h2 id="looks-h" className="mb-3 mt-1 text-3xl font-bold sm:text-4xl">From soft bridal glow to casual freshness</h2>
          <p className="text-ink-muted">Every bride, every Eid dinner and every Tuesday coffee date deserves its own look. Browse real work from verified GlamHub artists — each photo is checked by our AI so what you see is genuine, hand-done makeup.</p>
          <p className="mt-3 text-ink-muted">Artists add new photos to their portfolios all the time, and the best of them appear right here.</p>
          <Link to="/suggestions" className="pill pill-primary mt-5">Explore makeup looks</Link>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-12" aria-labelledby="how-h">
        <h2 id="how-h" className="mb-6 text-center text-3xl font-bold">Booking in three easy steps</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[['1', 'Find', 'Search by district and budget, then peek at portfolios and reviews.'], ['2', 'Book & verify', 'Pick a package and date, then verify with OTP, email, QR or Google Authenticator.'], ['3', 'Glow', 'Pay a small deposit online, get glammed up, and rate your artist afterwards.']].map(([n, t, d]) => (
            <div key={n} className="card p-6 text-center">
              <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand font-display text-xl font-bold">{n}</span>
              <h3 className="text-xl font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* process animation */}
      <section className="mx-auto max-w-6xl px-6 py-14 sm:px-12" aria-labelledby="process-h">
        <div className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-accent">Behind the brush</p>
          <h2 id="process-h" className="mt-1 text-3xl font-bold sm:text-4xl">How a look comes to life</h2>
          <p className="mx-auto mt-2 max-w-2xl text-ink-muted">Great makeup is a process, not a rush. Here is what your artist does, layer by layer, to create a look that lasts from the first photo to the last dance.</p>
        </div>
        <ProcessAnimation />
        {showcase.length > 0 && (
          <div className="mt-12 overflow-hidden" aria-label="Recent work from our artists">
            <p className="mb-3 text-center text-sm font-bold text-ink-muted">Fresh from artist portfolios</p>
            <div className="flex w-max gap-4" style={{ animation: 'marquee 40s linear infinite' }}>
              {[...showcase, ...showcase].map((s, i) => (
                <Link key={`${s.id}-${i}`} to={`/artists/${s.artistId}`} className="block h-44 w-36 shrink-0 overflow-hidden rounded-2xl shadow-card">
                  <img src={s.imageUrl} alt={s.caption || `Work by ${s.artistName}`} className="h-full w-full object-cover" loading="lazy" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-8 sm:px-12" aria-labelledby="feat-h">
          <div className="mb-5 flex items-end justify-between">
            <h2 id="feat-h" className="text-3xl font-bold">Featured artists</h2>
            <Link to="/search" className="pill">See all</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((a) => <ArtistCard key={a.id} artist={a} />)}</div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-14 sm:px-12">
        <div className="gradient-flow overflow-hidden rounded-[2rem] bg-gradient-to-r from-accent-light via-lavender to-accent-light p-10 text-center text-white shadow-hover">
          <h2 className="text-3xl font-bold sm:text-4xl">Are you a makeup artist?</h2>
          <p className="mx-auto mt-2 max-w-xl opacity-95">Show your portfolio, set your packages, manage your calendar and get booked by clients who value your art.</p>
          <Link to="/register" className="pill mt-6 !border-0 !text-accent">Join GlamHub</Link>
        </div>
      </section>
    </div>
  )
}
