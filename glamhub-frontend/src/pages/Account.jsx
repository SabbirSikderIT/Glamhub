import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DeleteAccountSection, ProfilePhotoUploader } from '../components/AccountParts.jsx'
import { Empty, ErrorBox, Field, Loading, Notice } from '../components/Widgets.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { STATUS_TINT, money, prettyDate } from '../utils/format.js'
import { errorMessage, getAccount, getMyBookings, updateAccount } from '../services/api.js'

export default function Account() {
  const { patch } = useAuth()
  const [form, setForm] = useState(null)
  const [bookings, setBookings] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setState('loading')
    Promise.all([getAccount(), getMyBookings()]).then(([a, b]) => {
      setForm({ name: a.name, phone: a.phone || '', location: a.location || '', bio: a.bio || '', email: a.email }); setBookings(b); setState('ready')
    }).catch((e) => { setError(errorMessage(e)); setState('error') })
  }
  useEffect(load, [])

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null)
    try { const a = await updateAccount(form); patch({ name: a.name }); setMsg({ kind: 'success', text: 'Saved ✨' }) } catch (err) { setMsg({ kind: 'error', text: errorMessage(err) }) } finally { setBusy(false) }
  }

  if (state === 'loading') return <Loading />
  if (state === 'error') return <ErrorBox message={error} onRetry={load} />
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 sm:px-12">
      <h1 className="text-4xl font-bold">My <span className="text-brand">account</span></h1>

      <section className="card space-y-4 p-6" aria-labelledby="prof">
        <h2 id="prof" className="text-2xl font-bold">Profile</h2>
        <ProfilePhotoUploader />
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><input className="field opacity-70" disabled value={form.email} /></Field>
          <Field label="Phone"><input className="field" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Where you live"><input className="field" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            {msg && <div className="mb-3"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
            <button className="pill pill-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </section>

      <section aria-labelledby="bk">
        <h2 id="bk" className="mb-3 text-2xl font-bold">My bookings</h2>
        {bookings.length === 0 ? <Empty emoji="💄" title="No bookings yet">Find an artist and book your first session.<div className="mt-3"><Link to="/search" className="pill pill-primary">Find a makeup artist</Link></div></Empty> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bookings.map((b) => (
              <article key={b.id} className="card p-4">
                <div className="flex items-start justify-between"><h3 className="font-display text-lg font-semibold">{b.artistName}</h3><span className={`chip ${STATUS_TINT[b.status]}`}>{b.status}</span></div>
                <p className="text-sm">{b.packageTitle} · {money(b.packagePrice)}</p>
                <p className="text-sm text-ink-muted">{prettyDate(b.bookingDate)}</p>
                <Link to={`/book/${b.artistId}?bookingId=${b.id}`} className="pill mt-3 !py-1">{b.status === 'COMPLETED' && !b.reviewed ? 'Rate session' : 'View booking'}</Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <DeleteAccountSection />
    </div>
  )
}
