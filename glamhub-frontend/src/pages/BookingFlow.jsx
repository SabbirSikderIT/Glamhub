import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AvailabilityCalendar from '../components/AvailabilityCalendar.jsx'
import { Empty, ErrorBox, Field, Loading, Notice, OtpInput, StarRating } from '../components/Widgets.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { STATUS_TINT, money, prettyDate } from '../utils/format.js'
import {
  chooseVerification, confirmBookingCode, createBooking, createReview, errorMessage, getArtist, getArtistAvailability,
  getArtistPackages, getBooking, getSlots, initiateDeposit,
} from '../services/api.js'

const STEPS = ['Details', 'Verify', 'Deposit', 'Confirmed']
const METHODS = [
  { id: 'PHONE_OTP', icon: '📱', title: 'Phone OTP', text: 'Get a code by SMS' },
  { id: 'EMAIL_OTP', icon: '✉️', title: 'Email OTP', text: 'Get a code by email' },
  { id: 'QR_CODE', icon: '🔳', title: 'QR code', text: 'Scan your artist\'s QR' },
  { id: 'TOTP', icon: '🔐', title: 'Google Authenticator', text: 'Use an authenticator app' },
]
const storeKey = (artistId) => `glamhub_booking_${artistId}`

export default function BookingFlow() {
  const { artistId } = useParams()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const { user } = useAuth()

  const [artist, setArtist] = useState(null)
  const [packages, setPackages] = useState([])
  const [slots, setSlots] = useState([])
  const [availability, setAvailability] = useState({})
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const [booking, setBooking] = useState(null)
  const [key, setKey] = useState(null)
  const [view, setView] = useState(null) // step the user is looking at (null = follow progress)
  const [banner, setBanner] = useState(null)

  const [form, setForm] = useState({ packageId: params.get('package') || '', date: '', slot: '', name: user?.name || '', phone: '', email: user?.email || '' })
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const [verify, setVerify] = useState(null) // response of chooseVerification
  const [code, setCode] = useState('')

  const progress = !booking ? 0 : !booking.verified ? 1 : !booking.depositPaid ? 2 : 3
  const step = view === null ? progress : Math.min(view, progress)

  const loadBooking = useCallback(async (id, k) => {
    const b = await getBooking(id, k)
    setBooking(b); setKey(k)
    try { sessionStorage.setItem(storeKey(artistId), JSON.stringify({ id, key: k })) } catch { /* ignore */ }
    return b
  }, [artistId])

  // initial load: artist data, then restore a booking in progress (from the payment redirect or this session)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [a, p, s] = await Promise.all([getArtist(artistId), getArtistPackages(artistId), getSlots()])
        if (cancelled) return
        setArtist(a); setPackages(p); setSlots(s)
        setForm((f) => ({ ...f, packageId: f.packageId || (p[0] ? String(p[0].id) : '') }))

        const payment = params.get('payment')
        let ref = null
        if (params.get('bookingId')) ref = { id: params.get('bookingId'), key: params.get('key') || null } // key is optional for logged-in owners
        else { try { ref = JSON.parse(sessionStorage.getItem(storeKey(artistId))) } catch { /* ignore */ } }
        if (ref) {
          try {
            const b = await loadBooking(ref.id, ref.key)
            if (payment === 'failed') setBanner({ kind: 'error', text: 'The payment didn\'t go through, so nothing was charged. You can try again below.' })
            else if (payment === 'cancelled') setBanner({ kind: 'info', text: 'You cancelled the payment. Your slot is held for a little while — you can pay whenever you\'re ready.' })
            else if (payment === 'success' && !b.depositPaid) setBanner({ kind: 'error', text: 'We couldn\'t confirm your payment yet. If money left your account, please contact support with booking #' + b.id + '.' })
            else if (payment === 'success') setBanner({ kind: 'success', text: 'Payment received. Thank you!' })
          } catch { try { sessionStorage.removeItem(storeKey(artistId)) } catch { /* ignore */ } }
          if (payment) nav(`/book/${artistId}`, { replace: true }) // strip the query parameters
        }
        setState('ready')
      } catch (e) {
        if (!cancelled) { setError(errorMessage(e)); setState('error') }
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artistId])

  const loadMonth = useCallback((month) => {
    const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    getArtistAvailability(artistId, f(new Date(month.getFullYear(), month.getMonth(), 1)), f(new Date(month.getFullYear(), month.getMonth() + 1, 0)))
      .then((list) => setAvailability((c) => ({ ...c, ...Object.fromEntries(list.map((a) => [a.date, a.status])) }))).catch(() => {})
  }, [artistId])
  useEffect(() => { const d = new Date(); loadMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }, [loadMonth])

  // QR method: poll until the artist's QR has been scanned
  const qrPending = booking && !booking.verified && booking.verificationMethod === 'QR_CODE'
  const pollRef = useRef(null)
  useEffect(() => {
    if (!qrPending) return undefined
    pollRef.current = setInterval(() => { loadBooking(booking.id, key).catch(() => {}) }, 3000)
    return () => clearInterval(pollRef.current)
  }, [qrPending, booking?.id, key, loadBooking])

  const submitDetails = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.packageId) return setFormError('Please choose a package.')
    if (!form.date) return setFormError('Please pick an available date on the calendar.')
    setBusy(true)
    try {
      const res = await createBooking({
        artistId: Number(artistId), packageId: Number(form.packageId), bookingDate: form.date, timeSlot: form.slot || null,
        clientName: form.name, clientPhone: form.phone, clientEmail: form.email,
      })
      setBooking(res.booking); setKey(res.accessKey); setView(null); setVerify(null)
      try { sessionStorage.setItem(storeKey(artistId), JSON.stringify({ id: res.booking.id, key: res.accessKey })) } catch { /* ignore */ }
    } catch (err) { setFormError(errorMessage(err)); loadMonth(new Date(form.date + 'T00:00:00')) } finally { setBusy(false) }
  }

  const pickMethod = async (method) => {
    setBusy(true); setFormError(''); setCode('')
    try {
      const res = await chooseVerification(booking.id, key, method)
      setVerify(res)
      setBooking((b) => ({ ...b, verificationMethod: method }))
    } catch (err) { setFormError(errorMessage(err)) } finally { setBusy(false) }
  }

  const submitCode = async (e) => {
    e.preventDefault()
    setBusy(true); setFormError('')
    try { setBooking(await confirmBookingCode(booking.id, key, code)); setView(null) } catch (err) { setFormError(errorMessage(err)) } finally { setBusy(false) }
  }

  const pay = async () => {
    setBusy(true); setFormError('')
    try { const res = await initiateDeposit(booking.id, key); window.location.href = res.gatewayUrl } catch (err) { setFormError(errorMessage(err)); setBusy(false) }
  }

  if (state === 'loading') return <Loading label="Preparing your booking…" />
  if (state === 'error') return <ErrorBox message={error} />
  const pkg = packages.find((p) => String(p.id) === String(form.packageId))

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-12">
      <p className="text-sm"><Link to={`/artists/${artistId}`} className="font-bold text-accent no-underline">← {artist.name}'s profile</Link></p>
      <h1 className="mb-6 mt-1 text-3xl font-bold">Book <span className="text-brand">{artist.name}</span></h1>

      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Booking steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" disabled={i > progress} onClick={() => setView(i)} aria-current={i === step ? 'step' : undefined}
              className={`pill w-full !px-2 ${i === step ? 'pill-active' : ''}`}>
              <span className="hidden sm:inline">{i + 1}.</span> {s}
            </button>
          </li>
        ))}
      </ol>

      {banner && <div className="mb-4"><Notice kind={banner.kind}>{banner.text}</Notice></div>}
      {formError && <div className="mb-4"><Notice kind="error">{formError}</Notice></div>}

      {/* step 0 */}
      {step === 0 && (
        packages.length === 0 ? <Empty emoji="🎀" title="No packages yet">{artist.name} hasn't added any packages, so booking isn't open yet.</Empty> : (
          <form onSubmit={submitDetails} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Package">
                <select className="field" value={form.packageId} onChange={(e) => setForm({ ...form, packageId: e.target.value })}>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.title} — {money(p.price)}</option>)}
                </select>
              </Field>
              <Field label="Time slot (optional)">
                <select className="field" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
                  <option value="">Flexible</option>
                  {slots.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Your name"><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone"><input className="field" required inputMode="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email"><input className="field" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            </div>
            <div className="space-y-4">
              <AvailabilityCalendar statuses={availability} selected={form.date} onMonthChange={loadMonth}
                onSelect={(d, st) => (st === 'FREE' ? setForm({ ...form, date: d }) : setFormError('That date isn\'t available. Please pick a green one.'))} />
              {form.date && <p className="text-center font-bold text-accent">Selected: {prettyDate(form.date)}</p>}
              {pkg && <p className="text-center text-sm text-ink-muted">Package total {money(pkg.price)} — you only pay a small deposit online.</p>}
              <button className="pill pill-primary w-full !py-3" disabled={busy}>{busy ? 'Reserving…' : 'Continue to verification'}</button>
            </div>
          </form>
        )
      )}

      {/* step 1 */}
      {step === 1 && booking && (
        <div className="space-y-5">
          <p className="text-ink-muted">Choose how you'd like to verify booking #{booking.id}. You can switch method until it's verified.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {METHODS.map((m) => (
              <button key={m.id} type="button" disabled={busy} onClick={() => pickMethod(m.id)}
                className={`card card-hover flex items-center gap-3 p-4 text-left ${booking.verificationMethod === m.id ? '!border-accent' : ''}`}>
                <span className="text-3xl">{m.icon}</span>
                <span><strong className="block">{m.title}</strong><span className="text-sm text-ink-muted">{m.text}</span></span>
              </button>
            ))}
          </div>

          {verify && booking.verificationMethod === verify.method && (
            <div className="card space-y-4 p-6 text-center">
              <p>{verify.message}</p>
              {verify.devCode && <Notice kind="info">Your code: <strong className="text-lg tracking-widest">{verify.devCode}</strong></Notice>}
              {verify.method === 'TOTP' && (
                <div>
                  <img src={verify.qrImage} alt="Authenticator QR code" className="mx-auto h-52 w-52 rounded-2xl" />
                  <p className="mt-2 text-xs text-ink-muted">Can't scan? Enter this key: <code className="font-bold">{verify.totpSecret}</code></p>
                </div>
              )}
              {verify.method === 'QR_CODE' ? (
                <p className="flex items-center justify-center gap-2 text-sm text-ink-muted"><span className="anim-twinkle inline-block h-2.5 w-2.5 rounded-full bg-accent" /> Waiting for the scan…</p>
              ) : (
                <form onSubmit={submitCode} className="space-y-4">
                  <OtpInput value={code} onChange={setCode} />
                  <button className="pill pill-primary" disabled={busy || code.length < 6}>{busy ? 'Checking…' : 'Verify'}</button>
                </form>
              )}
            </div>
          )}
          {qrPending && !verify && <Notice kind="info">Show this booking to your artist — they'll display a QR code for you to scan. We're waiting for the scan…</Notice>}
        </div>
      )}

      {/* step 2 */}
      {step === 2 && booking && (
        <div className="card mx-auto max-w-md space-y-3 p-6 text-center">
          <div className="text-4xl">✅</div>
          <h2 className="text-2xl font-bold">Booking verified</h2>
          <p className="text-ink-muted">Pay the deposit to lock in {prettyDate(booking.bookingDate)} with {booking.artistName}.</p>
          <p className="text-4xl font-bold text-accent">{money(booking.depositAmount)}</p>
          <p className="text-sm text-ink-muted">Deposit ({booking.depositPercent}%) of {money(booking.packagePrice)}. The rest is paid to your artist directly.</p>
          <button type="button" className="pill pill-primary w-full !py-3" onClick={pay} disabled={busy}>{busy ? 'Redirecting…' : 'Pay deposit securely'}</button>
          <p className="text-xs text-ink-muted">You'll be taken to SSLCommerz to pay by card, bKash, Nagad and more.</p>
        </div>
      )}

      {/* step 3 */}
      {step === 3 && booking && <Summary booking={booking} keyStr={key} onChange={setBooking} />}
    </div>
  )
}

function Summary({ booking, keyStr, onChange }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { await createReview({ bookingId: booking.id, rating, comment }, keyStr); onChange({ ...booking, reviewed: true }) } catch (x) { setErr(errorMessage(x)) } finally { setBusy(false) }
  }
  const label = { PENDING: 'Waiting for your artist to confirm', CONFIRMED: 'Confirmed — see you soon!', COMPLETED: 'Session completed', CANCELLED: 'Cancelled' }[booking.status]
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-bold">Booking #{booking.id}</h2>
          <span className={`chip ${STATUS_TINT[booking.status]}`}>{booking.status}</span>
        </div>
        <p className="mb-4 font-semibold text-accent">{label}</p>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-ink-muted">Artist</dt><dd className="font-bold">{booking.artistName}</dd></div>
          <div><dt className="text-ink-muted">Package</dt><dd className="font-bold">{booking.packageTitle} ({money(booking.packagePrice)})</dd></div>
          <div><dt className="text-ink-muted">Date</dt><dd className="font-bold">{prettyDate(booking.bookingDate)}{booking.timeSlot && ` · ${booking.timeSlot}`}</dd></div>
          <div><dt className="text-ink-muted">Deposit ({booking.depositPercent}%)</dt><dd className="font-bold">{money(booking.depositAmount)} {booking.depositPaid ? '· paid ✓' : '· unpaid'}</dd></div>
          <div><dt className="text-ink-muted">Verification</dt><dd className="font-bold">{booking.verified ? 'Verified ✓' : 'Not verified'}</dd></div>
        </dl>
      </div>
      {booking.status === 'COMPLETED' && !booking.reviewed && (
        <form onSubmit={submit} className="card space-y-3 p-6">
          <h3 className="text-xl font-semibold">How was your session?</h3>
          <StarRating value={rating} size="h-8 w-8" onChange={setRating} />
          <textarea className="field" rows={3} maxLength={1500} placeholder="Tell others about your experience (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
          {err && <Notice kind="error">{err}</Notice>}
          <button className="pill pill-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit rating'}</button>
        </form>
      )}
      {booking.reviewed && <Notice kind="success">Thanks for rating your session! 💖</Notice>}
    </div>
  )
}
