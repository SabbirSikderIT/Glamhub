import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AvailabilityCalendar from '../../components/AvailabilityCalendar.jsx'
import { BarChart } from '../../components/Charts.jsx'
import { BlueCheckIcon } from '../../components/Icons.jsx'
import { DeleteAccountSection, ProfilePhotoUploader } from '../../components/AccountParts.jsx'
import { Empty, ErrorBox, Field, Loading, Modal, Notice, StarRating } from '../../components/Widgets.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { BUDGETS, CATEGORIES, STATUS_TINT, money, prettyDate, toDateStr } from '../../utils/format.js'
import { optimize } from '../../utils/cdn.js'
import {
  createPackage, deletePackage, deletePortfolio, errorMessage, getArtistAvailability, getArtistBookings, getBadgeStatus,
  getBookingQr, getDistricts, getMyArtist, getMyPackages, getMyPortfolio, getMyReviews, purchaseBadge, replyToReview,
  setAvailability, updateBookingStatus, updateMyArtist, updatePackage, updatePortfolio, uploadPortfolio,
} from '../../services/api.js'

function useLoad(fn, deps = []) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setState('loading')
    fn().then((d) => { setData(d); setState('ready') }).catch((e) => { setError(errorMessage(e)); setState('error') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { load() }, [load])
  return { data, setData, state, error, reload: load }
}

const PageTitle = ({ children, sub }) => (
  <div className="mb-5"><h1 className="text-3xl font-bold">{children}</h1>{sub && <p className="text-ink-muted">{sub}</p>}</div>
)

// ---------------- overview ----------------
export function DashOverview() {
  const { user } = useAuth()
  const { data, state, error, reload } = useLoad(() => Promise.all([getArtistBookings(), getMyArtist(), getMyPortfolio()]))
  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  const [bookings, me, photos] = data
  const months = Array.from({ length: 6 }).map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d })
  const label = (d) => d.toLocaleDateString('en-GB', { month: 'short' })
  const sameMonth = (iso, d) => { const x = new Date(iso + 'T00:00:00'); return x.getMonth() === d.getMonth() && x.getFullYear() === d.getFullYear() }
  const bookingsPerMonth = months.map((d) => ({ label: label(d), value: bookings.filter((b) => b.status !== 'CANCELLED' && sameMonth(b.bookingDate, d)).length }))
  const earnedPerMonth = months.map((d) => ({ label: label(d), value: bookings.filter((b) => (b.status === 'CONFIRMED' || b.status === 'COMPLETED') && sameMonth(b.bookingDate, d)).reduce((s, b) => s + Number(b.packagePrice), 0) }))
  const pending = bookings.filter((b) => b.status === 'PENDING').length
  const live = photos.filter((p) => p.verificationStatus === 'VERIFIED').length
  const held = photos.filter((p) => p.verificationStatus !== 'VERIFIED').length

  return (
    <div>
      <PageTitle sub="Here's how your business is doing.">Hello, {user.name.split(' ')[0]} 💖</PageTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Pending requests', pending, '🔔'], ['Total bookings', bookings.length, '📅'], ['Rating', me.totalReviews ? `${me.ratingAvg.toFixed(1)} ★` : '—', '⭐'], ['Photos live', `${live}${held ? ` (+${held} held)` : ''}`, '📸']].map(([t, v, e]) => (
          <div key={t} className="card p-5"><div className="text-2xl">{e}</div><p className="text-sm text-ink-muted">{t}</p><p className="font-display text-3xl font-bold">{v}</p></div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <BarChart title="Bookings per month" data={bookingsPerMonth} />
        <BarChart title="Earnings per month (confirmed + completed)" data={earnedPerMonth} color="var(--color-lavender)" format={(v) => (v >= 1000 ? `৳${Math.round(v / 100) / 10}k` : `৳${v}`)} />
      </div>
    </div>
  )
}

// ---------------- portfolio ----------------
export function DashPortfolio() {
  const { data, setData, state, error, reload } = useLoad(getMyPortfolio)
  const [category, setCategory] = useState('CASUAL')
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const input = useRef(null)

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true); setMsg(null)
    for (const f of files) {
      try {
        const p = await uploadPortfolio(f, category, caption)
        setData((cur) => [p, ...(cur || [])])
        setMsg(p.verificationStatus === 'VERIFIED' ? { kind: 'success', text: 'Photo checked and published! ✨' }
          : p.verificationStatus === 'FLAGGED' ? { kind: 'error', text: p.rejectionReason } : { kind: 'info', text: 'Photo uploaded and waiting for a manual review.' })
      } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }) }
    }
    setCaption(''); setBusy(false)
  }

  const remove = async (id) => {
    if (!window.confirm('Remove this photo from your portfolio?')) return
    try { await deletePortfolio(id); setData((c) => c.filter((p) => p.id !== id)) } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }) }
  }
  const recat = async (p, cat) => {
    try { const u = await updatePortfolio(p.id, { category: cat }); setData((c) => c.map((x) => (x.id === p.id ? u : x))) } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }) }
  }

  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div>
      <PageTitle sub="Every upload is checked by our AI before it goes live, so clients can trust what they see.">Portfolio</PageTitle>
      <div className="card mb-6 grid gap-3 p-5 md:grid-cols-[160px_1fr_auto]">
        <select className="field" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input className="field" placeholder="Caption (optional)" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} />
        <button type="button" className="pill pill-primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Checking photo…' : '＋ Upload photos'}</button>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={onFiles} />
        {msg && <div className="md:col-span-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      </div>
      {data.length === 0 ? <Empty emoji="📸" title="Your portfolio is empty">Upload your best work — real photos of your own makeup.</Empty> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {data.map((p) => (
            <figure key={p.id} className="card overflow-hidden">
              <img src={optimize(p.imageUrl, 500)} alt={p.caption || 'Portfolio photo'} className="aspect-[4/5] w-full object-cover" loading="lazy" />
              <figcaption className="space-y-2 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={`chip ${STATUS_TINT[p.verificationStatus]}`}>{p.verificationStatus === 'VERIFIED' ? 'Live' : p.verificationStatus === 'FLAGGED' ? 'Rejected' : 'In review'}</span>
                  <button type="button" onClick={() => remove(p.id)} className="text-ink-muted hover:text-[#d6455d]" aria-label="Remove photo">🗑</button>
                </div>
                {p.rejectionReason && <p className="text-xs text-[#9c2340]">{p.rejectionReason}</p>}
                <select className="field !py-1 !text-xs" value={p.category} onChange={(e) => recat(p, e.target.value)} aria-label="Category">
                  {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- calendar ----------------
export function DashCalendar() {
  const { user } = useAuth()
  const [statuses, setStatuses] = useState({})
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  const loadMonth = useCallback((m) => {
    setMonth(m)
    getArtistAvailability(user.userId, toDateStr(m), toDateStr(new Date(m.getFullYear(), m.getMonth() + 1, 0)))
      .then((list) => setStatuses((c) => ({ ...c, ...Object.fromEntries(list.map((a) => [a.date, a.status])) }))).catch((e) => setError(errorMessage(e)))
  }, [user.userId])
  useEffect(() => { loadMonth(month) /* eslint-disable-next-line */ }, [])

  const toggle = async (date, st) => {
    setError('')
    if (st === 'BOOKED') return setError('That date has a booking, so it can\'t be changed.')
    const next = st === 'BLOCKED' ? 'FREE' : 'BLOCKED'
    try { await setAvailability(date, next); setStatuses((c) => ({ ...c, [date]: next })) } catch (e) { setError(errorMessage(e)) }
  }
  return (
    <div className="max-w-xl">
      <PageTitle sub="Tap a date to block it (days off) or make it available again. Booked dates are locked.">Availability calendar</PageTitle>
      {error && <div className="mb-3"><Notice kind="error">{error}</Notice></div>}
      <AvailabilityCalendar statuses={statuses} onSelect={toggle} onMonthChange={loadMonth} />
    </div>
  )
}

// ---------------- packages ----------------
const EMPTY_PKG = { title: '', description: '', price: '', durationHours: 2, includes: '' }
export function DashPackages() {
  const { data, setData, state, error, reload } = useLoad(getMyPackages)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_PKG)
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const open = (p) => { setEditing(p || {}); setForm(p ? { title: p.title, description: p.description || '', price: p.price, durationHours: p.durationHours, includes: p.includes || '' } : EMPTY_PKG); setFormError('') }
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setFormError('')
    const body = { ...form, price: Number(form.price), durationHours: Number(form.durationHours) }
    try {
      const saved = editing.id ? await updatePackage(editing.id, body) : await createPackage(body)
      setData((cur) => (editing.id ? cur.map((p) => (p.id === saved.id ? saved : p)) : [...cur, saved]).sort((a, b) => a.price - b.price))
      setEditing(null)
    } catch (err) { setFormError(errorMessage(err)) } finally { setBusy(false) }
  }
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"?`)) return
    try { await deletePackage(p.id); setData((c) => c.filter((x) => x.id !== p.id)) } catch (err) { window.alert(errorMessage(err)) }
  }

  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div>
      <div className="mb-5 flex items-center justify-between"><PageTitle sub="What clients can book from you.">Packages</PageTitle><button type="button" className="pill pill-primary" onClick={() => open(null)}>＋ New package</button></div>
      {data.length === 0 ? <Empty emoji="🎀" title="No packages yet">Add at least one package so clients can book you.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <div key={p.id} className="card p-5">
              <h3 className="text-xl font-semibold">{p.title}</h3>
              <p className="text-2xl font-bold text-accent">{money(p.price)}</p>
              <p className="text-sm text-ink-muted">{p.durationHours}h</p>
              {p.description && <p className="mt-2 text-sm">{p.description}</p>}
              {p.includes && <p className="mt-1 text-sm text-ink-muted">✨ {p.includes}</p>}
              <div className="mt-3 flex gap-2"><button type="button" className="pill !py-1" onClick={() => open(p)}>Edit</button><button type="button" className="pill pill-danger !py-1" onClick={() => remove(p)}>Delete</button></div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <Modal title={editing.id ? 'Edit package' : 'New package'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Title"><input className="field" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (৳)"><input className="field" type="number" min="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
              <Field label="Hours"><input className="field" type="number" min="1" max="24" required value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea className="field" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="What's included"><input className="field" placeholder="HD base, lashes, hair styling" value={form.includes} onChange={(e) => setForm({ ...form, includes: e.target.value })} /></Field>
            {formError && <Notice kind="error">{formError}</Notice>}
            <button className="pill pill-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save package'}</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ---------------- bookings ----------------
export function DashBookings() {
  const { data, setData, state, error, reload } = useLoad(getArtistBookings)
  const [qr, setQr] = useState(null)
  const [msg, setMsg] = useState('')

  // keep fresh so QR scans and new requests show up
  useEffect(() => { const t = setInterval(() => getArtistBookings().then(setData).catch(() => {}), 15000); return () => clearInterval(t) }, [setData])

  const change = async (b, status) => {
    setMsg('')
    try { const u = await updateBookingStatus(b.id, status); setData((c) => c.map((x) => (x.id === u.id ? u : x))) } catch (e) { setMsg(errorMessage(e)) }
  }
  const showQr = async (b) => { setMsg(''); try { setQr({ booking: b, ...(await getBookingQr(b.id)) }) } catch (e) { setMsg(errorMessage(e)) } }

  const groups = useMemo(() => ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => [s, (data || []).filter((b) => b.status === s)]), [data])
  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div>
      <PageTitle sub="Confirm a request once the client has verified and paid the deposit.">Bookings</PageTitle>
      {msg && <div className="mb-3"><Notice kind="error">{msg}</Notice></div>}
      {data.length === 0 && <Empty emoji="📅" title="No bookings yet">When clients book you, they'll show up here.</Empty>}
      {groups.map(([status, list]) => list.length > 0 && (
        <section key={status} className="mb-8">
          <h2 className="mb-3 text-xl font-bold">{status.charAt(0) + status.slice(1).toLowerCase()} ({list.length})</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((b) => (
              <article key={b.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="font-display text-lg font-semibold">{b.clientName}</h3><p className="text-sm text-ink-muted">{b.clientPhone} · {b.clientEmail}</p></div>
                  <span className={`chip ${STATUS_TINT[b.status]}`}>{b.status}</span>
                </div>
                <p className="mt-2 text-sm"><strong>{b.packageTitle}</strong> · {money(b.packagePrice)}</p>
                <p className="text-sm">{prettyDate(b.bookingDate)}{b.timeSlot && ` · ${b.timeSlot}`}</p>
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className={`chip ${b.verified ? STATUS_TINT.CONFIRMED : STATUS_TINT.PENDING}`}>{b.verified ? `Verified${b.verificationMethod ? ` (${b.verificationMethod.replace('_', ' ').toLowerCase()})` : ''}` : 'Not verified'}</span>
                  <span className={`chip ${b.depositPaid ? STATUS_TINT.CONFIRMED : STATUS_TINT.PENDING}`}>Deposit {money(b.depositAmount)} {b.depositPaid ? 'paid' : 'unpaid'}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.verificationMethod === 'QR_CODE' && !b.verified && <button type="button" className="pill !py-1" onClick={() => showQr(b)}>Show QR code</button>}
                  {b.status === 'PENDING' && <><button type="button" className="pill pill-primary !py-1" onClick={() => change(b, 'CONFIRMED')}>Confirm</button><button type="button" className="pill pill-danger !py-1" onClick={() => change(b, 'CANCELLED')}>Decline</button></>}
                  {b.status === 'CONFIRMED' && <><button type="button" className="pill pill-primary !py-1" onClick={() => change(b, 'COMPLETED')}>Mark completed</button><button type="button" className="pill pill-danger !py-1" onClick={() => change(b, 'CANCELLED')}>Cancel</button></>}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {qr && (
        <Modal title={`Verify ${qr.booking.clientName}`} onClose={() => setQr(null)}>
          <div className="text-center">
            <img src={qr.qrImage} alt="Booking verification QR code" className="mx-auto h-64 w-64 rounded-2xl" />
            <p className="mt-2 text-sm text-ink-muted">Ask your client to scan this with their phone camera.</p>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ---------------- reviews ----------------
export function DashReviews() {
  const { data, setData, state, error, reload } = useLoad(getMyReviews)
  const [drafts, setDrafts] = useState({})
  const [msg, setMsg] = useState('')
  const send = async (r) => {
    setMsg('')
    try { const u = await replyToReview(r.id, drafts[r.id]); setData((c) => c.map((x) => (x.id === u.id ? u : x))); setDrafts((d) => ({ ...d, [r.id]: undefined })) } catch (e) { setMsg(errorMessage(e)) }
  }
  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div>
      <PageTitle sub="Say thank you to your clients. You can reply and edit your reply any time.">Feedback</PageTitle>
      {msg && <Notice kind="error">{msg}</Notice>}
      {data.length === 0 ? <Empty emoji="💬" title="No reviews yet">After a completed session, clients can rate you.</Empty> : (
        <div className="space-y-3">
          {data.map((r) => (
            <article key={r.id} className="card p-4">
              <div className="flex items-center justify-between"><strong>{r.clientName}</strong><StarRating value={r.rating} /></div>
              {r.comment && <p className="mt-1">{r.comment}</p>}
              <div className="mt-3 flex gap-2">
                <input className="field" placeholder="Write a reply…" maxLength={1500} value={drafts[r.id] ?? r.artistReply ?? ''} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} aria-label="Reply" />
                <button type="button" className="pill pill-primary" disabled={!(drafts[r.id] ?? '').trim()} onClick={() => send(r)}>{r.artistReply ? 'Update' : 'Reply'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------- profile ----------------
export function DashProfile() {
  const { patch } = useAuth()
  const [districts, setDistricts] = useState({})
  const { data, state, error, reload } = useLoad(getMyArtist)
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getDistricts().then(setDistricts).catch(() => {}) }, [])
  useEffect(() => { if (data) setForm({ name: data.name, phone: data.phone || '', bio: data.bio || '', baseLocation: data.location || '', yearsExperience: data.yearsExperience, budgetTier: data.budgetTier }) }, [data])

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    try { const u = await updateMyArtist({ ...form, yearsExperience: Number(form.yearsExperience) }); patch({ name: u.name }); setMsg({ kind: 'success', text: 'Profile saved ✨' }) } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }) } finally { setBusy(false) }
  }
  if (state === 'loading' || !form) return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div className="max-w-2xl">
      <PageTitle sub="This is what clients see on your public profile.">Profile settings</PageTitle>
      <div className="card mb-5 p-5"><ProfilePhotoUploader /></div>
      <form onSubmit={save} className="card space-y-4 p-5">
        <Field label="Full name"><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><input className="field" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Years of experience"><input className="field" type="number" min="0" max="80" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })} /></Field>
        </div>
        <Field label="District">
          <select className="field" value={form.baseLocation} onChange={(e) => setForm({ ...form, baseLocation: e.target.value })}>
            {Object.entries(districts).map(([division, list]) => <optgroup key={division} label={division}>{list.map((d) => <option key={d}>{d}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Budget tier" hint="Shown to clients and used by the budget filter.">
          <div className="flex gap-2">{Object.entries(BUDGETS).map(([k, b]) => <button type="button" key={k} onClick={() => setForm({ ...form, budgetTier: k })} className={`pill flex-1 ${form.budgetTier === k ? 'pill-active' : ''}`}>{b.label}</button>)}</div>
        </Field>
        <Field label="About you"><textarea className="field" rows={4} maxLength={2000} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        <button className="pill pill-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
    </div>
  )
}

// ---------------- verified badge ----------------
export function DashBadge() {
  const [params] = useSearchParams()
  const { data, state, error, reload } = useLoad(getBadgeStatus)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const payment = params.get('payment')
  const buy = async () => {
    setBusy(true); setErr('')
    try { const r = await purchaseBadge(); window.location.href = r.gatewayUrl } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={reload} />
  return (
    <div className="max-w-xl">
      <PageTitle sub="Stand out and get shown first in search results.">Verified badge</PageTitle>
      {payment === 'success' && <div className="mb-4"><Notice kind="success">Payment received — your badge is live! 🎉</Notice></div>}
      {payment === 'failed' && <div className="mb-4"><Notice kind="error">The payment didn't go through, so nothing was charged.</Notice></div>}
      {payment === 'cancelled' && <div className="mb-4"><Notice kind="info">You cancelled the payment. You can try again whenever you like.</Notice></div>}
      <div className="card space-y-4 p-6 text-center">
        <BlueCheckIcon className="mx-auto h-20 w-20" />
        {data.active ? (
          <><h2 className="text-2xl font-bold">You're verified!</h2><p className="text-ink-muted">Your blue badge shows on your profile and cards, and you appear first in search.</p></>
        ) : (
          <>
            <h2 className="text-2xl font-bold">Get the blue badge</h2>
            <ul className="space-y-1 text-left text-ink-muted"><li>✓ A blue check next to your name</li><li>✓ Top placement in search results</li><li>✓ More trust from new clients</li></ul>
            <p className="text-4xl font-bold text-accent">{money(data.price)}</p>
            {err && <Notice kind="error">{err}</Notice>}
            <button type="button" className="pill pill-primary w-full !py-3" onClick={buy} disabled={busy}>{busy ? 'Redirecting…' : 'Buy the badge securely'}</button>
            <p className="text-xs text-ink-muted">Paid once through SSLCommerz. Badges aren't refundable.</p>
          </>
        )}
      </div>
    </div>
  )
}

export function DashDelete() {
  return <div className="max-w-xl"><PageTitle>Account</PageTitle><DeleteAccountSection /></div>
}
