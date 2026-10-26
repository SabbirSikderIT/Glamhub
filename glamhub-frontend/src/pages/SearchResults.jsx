import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ArtistCard from '../components/ArtistCard.jsx'
import { Empty, ErrorBox, Loading } from '../components/Widgets.jsx'
import { BUDGETS, CATEGORIES } from '../utils/format.js'
import { errorMessage, getDistricts, searchArtists } from '../services/api.js'

export default function SearchResults() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const district = params.get('district') || ''
  const budget = params.get('budget') || ''
  const category = params.get('category') || ''

  const [text, setText] = useState(q)
  const [districts, setDistricts] = useState({})
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [state, setState] = useState('loading') // loading | error | ready
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const reqId = useRef(0)
  const sentinel = useRef(null)

  useEffect(() => { getDistricts().then(setDistricts).catch(() => {}) }, [])
  useEffect(() => setText(q), [q])

  const load = useCallback(async (pageNo, append) => {
    const id = ++reqId.current // a stale response never overwrites a newer one
    try {
      append ? setLoadingMore(true) : setState('loading')
      const res = await searchArtists({ q, district, budget, category, page: pageNo, size: 12 })
      if (id !== reqId.current) return
      setItems((cur) => (append ? [...cur, ...res.items] : res.items))
      setPage(res.page)
      setHasMore(res.hasMore)
      setTotal(res.total)
      setState('ready')
    } catch (e) {
      if (id !== reqId.current) return
      setError(errorMessage(e))
      setState('error')
    } finally {
      if (id === reqId.current) setLoadingMore(false)
    }
  }, [q, district, budget, category])

  useEffect(() => { load(0, false) }, [load])

  // auto-load the next page near the end of the list
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore || loadingMore || state !== 'ready') return undefined
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) load(page + 1, true) }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, page, load, state])

  const setParam = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-12">
      <h1 className="text-4xl font-bold">Find a <span className="text-brand">makeup artist</span></h1>
      <p className="mt-1 text-ink-muted">Search by name, district, budget and the kind of look you want.</p>

      <form className="card mt-6 grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]" onSubmit={(e) => { e.preventDefault(); setParam('q', text.trim()) }} role="search">
        <input className="field" placeholder="Search by artist name" value={text} onChange={(e) => setText(e.target.value)} aria-label="Artist name" />
        <select className="field" value={district} onChange={(e) => setParam('district', e.target.value)} aria-label="District">
          <option value="">Any district</option>
          {Object.entries(districts).map(([division, list]) => (
            <optgroup key={division} label={division}>{list.map((d) => <option key={d}>{d}</option>)}</optgroup>
          ))}
        </select>
        <button className="pill pill-primary" type="submit">Search</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-ink-muted">Budget</span>
        <button type="button" className={`pill !py-1.5 ${!budget ? 'pill-active' : ''}`} onClick={() => setParam('budget', '')}>Any</button>
        {Object.entries(BUDGETS).map(([k, b]) => (
          <button key={k} type="button" className={`pill !py-1.5 ${budget === k ? 'pill-active' : ''}`} onClick={() => setParam('budget', k)}>{b.label}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-ink-muted">Look</span>
        <button type="button" className={`pill !py-1.5 ${!category ? 'pill-active' : ''}`} onClick={() => setParam('category', '')}>Any</button>
        {Object.entries(CATEGORIES).map(([k, label]) => (
          <button key={k} type="button" className={`pill !py-1.5 ${category.toUpperCase() === k ? 'pill-active' : ''}`} onClick={() => setParam('category', k.toLowerCase())}>{label}</button>
        ))}
      </div>

      <div className="mt-8" aria-live="polite">
        {state === 'loading' && <Loading label="Finding artists…" />}
        {state === 'error' && <ErrorBox message={error} onRetry={() => load(0, false)} />}
        {state === 'ready' && items.length === 0 && (
          <Empty emoji="🔍" title="No artists found">Try another district, a different budget, or clear the filters.</Empty>
        )}
        {state === 'ready' && items.length > 0 && (
          <>
            <p className="mb-3 text-sm text-ink-muted">{total} artist{total === 1 ? '' : 's'} found</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((a) => <ArtistCard key={a.id} artist={a} />)}</div>
            <div ref={sentinel} className="h-8" />
            {loadingMore && <Loading label="Loading more…" />}
            {hasMore && !loadingMore && <div className="text-center"><button type="button" className="pill" onClick={() => load(page + 1, true)}>Show more artists</button></div>}
          </>
        )}
      </div>
    </div>
  )
}
