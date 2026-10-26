import { useCallback, useEffect, useState } from 'react'
import { BarChart, DonutChart } from '../../components/Charts.jsx'
import FaceArt from '../../components/FaceArt.jsx'
import { Empty, ErrorBox, Field, Loading, Modal, Notice, StatusChip } from '../../components/Widgets.jsx'
import { useMainAdmin } from './AdminLayout.jsx'
import { STATUS_TINT, money, prettyDateTime } from '../../utils/format.js'
import { StarRating } from '../../components/Widgets.jsx'
import * as api from '../../services/api.js'

function useLoad(fn) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const load = useCallback(() => {
    setState('loading')
    fn().then((d) => { setData(d); setState('ready') }).catch((e) => { setError(api.errorMessage(e)); setState('error') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { load() }, [load])
  return { data, setData, state, error, reload: load }
}
const Title = ({ children, sub }) => <div className="mb-5"><h1 className="text-3xl font-bold">{children}</h1>{sub && <p className="text-ink-muted">{sub}</p>}</div>
const Gate = ({ state, error, reload, children }) => (state === 'loading' ? <Loading /> : state === 'error' ? <ErrorBox message={error} onRetry={reload} /> : children)

function MainOnly({ children }) {
  const main = useMainAdmin()
  if (!main) return <Empty emoji="🔒" title="Main admin only">This section is restricted to the main admin account.</Empty>
  return children
}

// ---------------- overview ----------------
export function AdminOverview() {
  const { data, state, error, reload } = useLoad(api.adminOverview)
  return (
    <Gate state={state} error={error} reload={reload}>
      {data && (
        <div>
          <Title sub="A quick look at how GlamHub is doing.">Overview</Title>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Artists', data.artists, '💄'], ['Clients', data.customers, '🙋‍♀️'], ['Bookings', data.bookings, '📅'], ['Deposits collected', money(data.depositsCollected), '💰'], ['Badge revenue', money(data.badgeRevenue), '✔️'], ['Active badges', data.activeBadges, '🏅'], ['Reviews', data.reviews, '⭐'], ['Verified artists', data.verifiedArtists, '✅']].map(([t, v, e]) => (
              <div key={t} className="card p-5"><div className="text-2xl">{e}</div><p className="text-sm text-ink-muted">{t}</p><p className="font-display text-2xl font-bold">{v}</p></div>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <BarChart title="Bookings (last 6 months)" data={data.monthlyBookings.map((m) => ({ label: m.month.slice(5), value: m.bookings }))} />
            <DonutChart title="Bookings by status" data={Object.entries(data.bookingsByStatus).map(([label, value]) => ({ label, value }))} />
            <DonutChart title="Portfolio photos" data={Object.entries(data.photosByStatus).map(([label, value]) => ({ label, value }))} />
          </div>
          <div className="card mt-6 p-5">
            <h2 className="mb-2 text-xl font-bold">Top artists (completed sessions)</h2>
            {data.topArtists.length === 0 ? <p className="text-ink-muted">No completed sessions yet.</p> : (
              <ol className="space-y-1">{data.topArtists.map((a, i) => <li key={a.artistId} className="flex justify-between"><span>{i + 1}. {a.name}</span><strong>{a.completed}</strong></li>)}</ol>
            )}
          </div>
        </div>
      )}
    </Gate>
  )
}

// ---------------- reviews ----------------
export function AdminReviews() {
  const { data, setData, state, error, reload } = useLoad(api.adminReviews)
  const remove = async (r) => {
    if (!window.confirm('Remove this review? It will disappear from the artist\'s profile.')) return
    try { const u = await api.adminRemoveReview(r.id); setData((c) => c.map((x) => (x.id === u.id ? u : x))) } catch (e) { window.alert(api.errorMessage(e)) }
  }
  return (
    <Gate state={state} error={error} reload={reload}>
      <Title sub="Reviews are published instantly. Remove any that break the rules.">Review moderation</Title>
      {data && data.length === 0 ? <Empty emoji="⭐" title="No reviews yet" /> : (
        <div className="space-y-3">
          {data?.map((r) => (
            <article key={r.id} className={`card p-4 ${r.status === 'REJECTED' ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{r.clientName} → {r.artistName}</strong><span className="flex items-center gap-2"><StarRating value={r.rating} /><StatusChip status={r.status} tintMap={STATUS_TINT} /></span></div>
              {r.comment && <p className="mt-1">{r.comment}</p>}
              <div className="mt-2 flex items-center justify-between text-xs text-ink-muted"><span>{prettyDateTime(r.createdAt)}</span>{r.status === 'APPROVED' && <button type="button" className="pill pill-danger !py-1" onClick={() => remove(r)}>Remove</button>}</div>
            </article>
          ))}
        </div>
      )}
    </Gate>
  )
}

// ---------------- photos ----------------
const TABS = [['', 'All'], ['VERIFIED', 'Verified'], ['FLAGGED', 'Flagged'], ['PENDING', 'Needs review']]
export function AdminPhotos() {
  const [tab, setTab] = useState('')
  const [list, setList] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [limit, setLimit] = useState(24)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setState('loading'); setLimit(24)
    api.adminPhotos(tab).then((d) => { setList(d); setState('ready') }).catch((e) => { setError(api.errorMessage(e)); setState('error') })
  }, [tab])
  useEffect(() => { load() }, [load])

  const act = async (id, fn) => {
    setBusyId(id)
    try { const u = await fn(id); setList((c) => c.map((x) => (x.id === id ? u : x))) } catch (e) { window.alert(api.errorMessage(e)) } finally { setBusyId(null) }
  }
  const reject = (p) => { const note = window.prompt('Reason shown to the artist (optional):', '') ; if (note !== null) act(p.id, (id) => api.adminRejectPhoto(id, note)) }

  return (
    <div>
      <Title sub="Photos are screened automatically. Review anything flagged or unscreened, or run a deeper check.">Photo moderation</Title>
      <div className="mb-4 flex flex-wrap gap-2">{TABS.map(([k, l]) => <button key={k} type="button" className={`pill !py-1.5 ${tab === k ? 'pill-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}</div>
      <Gate state={state} error={error} reload={load}>
        {list && list.length === 0 ? <Empty emoji="🖼" title="Nothing here" /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {list?.slice(0, limit).map((p) => (
                <article key={p.id} className="card overflow-hidden">
                  <img src={p.imageUrl} alt={p.caption || 'Portfolio photo'} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <div className="space-y-2 p-3 text-sm">
                    <div className="flex items-center justify-between"><strong>{p.artistName}</strong><StatusChip status={p.verificationStatus} tintMap={STATUS_TINT} /></div>
                    {p.detectraConfidence != null && <p className="text-xs text-ink-muted">Detectra v3: {p.detectraVerdict} ({Math.round(p.detectraConfidence * 100)}% AI)</p>}
                    {p.aiCheckVerdict && <p className="text-xs text-ink-muted">Deep check: {p.aiCheckVerdict} {p.aiCheckConfidence != null && `(${Math.round(p.aiCheckConfidence * 100)}%)`}</p>}
                    {p.flagReason && <p className="text-xs text-[#9c2340]">{p.flagReason}</p>}
                    <div className="flex flex-wrap gap-2">
                      {p.verificationStatus !== 'VERIFIED' && <button type="button" className="pill pill-primary !py-1" disabled={busyId === p.id} onClick={() => act(p.id, api.adminApprovePhoto)}>Approve</button>}
                      {p.verificationStatus !== 'FLAGGED' && <button type="button" className="pill pill-danger !py-1" disabled={busyId === p.id} onClick={() => reject(p)}>Reject</button>}
                      <button type="button" className="pill !py-1" disabled={busyId === p.id} onClick={() => act(p.id, api.adminDeepCheck)}>{busyId === p.id ? 'Checking…' : 'AI deep check'}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {list && list.length > limit && <div className="mt-4 text-center"><button type="button" className="pill" onClick={() => setLimit((l) => l + 24)}>Show more ({list.length - limit} left)</button></div>}
          </>
        )}
      </Gate>
    </div>
  )
}

// ---------------- palettes ----------------
const EMPTY_PALETTE = { name: '', occasion: 'Bridal', skinTone: 'ALL', description: '', swatches: '#f4cfd0,#e8a0a8,#c97b84', swatchNames: 'Blush,Rose,Dusty rose', tips: '' }
export function AdminPalettes() {
  const { data, setData, state, error, reload } = useLoad(api.getPalettes)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState(EMPTY_PALETTE)
  const [err, setErr] = useState('')
  const open = (p) => { setEdit(p || {}); setForm(p ? { ...EMPTY_PALETTE, ...p } : EMPTY_PALETTE); setErr('') }
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try {
      const s = await api.adminSavePalette(edit.id, form)
      setData((c) => (edit.id ? c.map((x) => (x.id === s.id ? s : x)) : [...c, s])); setEdit(null)
    } catch (x) { setErr(api.errorMessage(x)) }
  }
  const remove = async (p) => { if (window.confirm(`Delete "${p.name}"?`)) { try { await api.adminDeletePalette(p.id); setData((c) => c.filter((x) => x.id !== p.id)) } catch (x) { window.alert(api.errorMessage(x)) } } }
  return (
    <Gate state={state} error={error} reload={reload}>
      <div className="mb-5 flex items-center justify-between"><Title sub="Shown on the Suggestions page.">Colour palettes</Title><button type="button" className="pill pill-primary" onClick={() => open(null)}>＋ New palette</button></div>
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            <div className="flex h-10">{p.swatches.split(',').map((c) => <i key={c} className="flex-1" style={{ background: c }} />)}</div>
            <div className="p-4"><h3 className="font-semibold">{p.name} <span className="text-xs text-ink-muted">· {p.occasion} · {p.skinTone}</span></h3>
              <div className="mt-2 flex gap-2"><button type="button" className="pill !py-1" onClick={() => open(p)}>Edit</button><button type="button" className="pill pill-danger !py-1" onClick={() => remove(p)}>Delete</button></div></div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit palette' : 'New palette'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name"><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Occasion"><input className="field" value={form.occasion || ''} onChange={(e) => setForm({ ...form, occasion: e.target.value })} /></Field>
              <Field label="Skin tone"><select className="field" value={form.skinTone || 'ALL'} onChange={(e) => setForm({ ...form, skinTone: e.target.value })}>{['ALL', 'FAIR', 'MEDIUM', 'DEEP'].map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
            <Field label="Colours (hex, comma separated)"><input className="field" required value={form.swatches} onChange={(e) => setForm({ ...form, swatches: e.target.value })} /></Field>
            <Field label="Colour names (same order)"><input className="field" value={form.swatchNames || ''} onChange={(e) => setForm({ ...form, swatchNames: e.target.value })} /></Field>
            <Field label="Description"><textarea className="field" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Tips"><textarea className="field" rows={2} value={form.tips || ''} onChange={(e) => setForm({ ...form, tips: e.target.value })} /></Field>
            {err && <Notice kind="error">{err}</Notice>}
            <button className="pill pill-primary w-full">Save</button>
          </form>
        </Modal>
      )}
    </Gate>
  )
}

// ---------------- looks ----------------
const EMPTY_LOOK = { level: 'LIGHT', title: '', description: '', steps: '', bestFor: '', products: '', lipColor: '#e58c93', eyeColor: '#d9b8a4', blushColor: '#f0a9a0' }
export function AdminLooks() {
  const { data, setData, state, error, reload } = useLoad(api.getLooks)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState(EMPTY_LOOK)
  const [err, setErr] = useState('')
  const open = (l) => { setEdit(l || {}); setForm(l ? { ...EMPTY_LOOK, ...l } : EMPTY_LOOK); setErr('') }
  const save = async (e) => {
    e.preventDefault(); setErr('')
    try { const s = await api.adminSaveLook(edit.id, form); setData((c) => (edit.id ? c.map((x) => (x.id === s.id ? s : x)) : [...c, s])); setEdit(null) } catch (x) { setErr(api.errorMessage(x)) }
  }
  const remove = async (l) => { if (window.confirm(`Delete "${l.title}"?`)) { try { await api.adminDeleteLook(l.id); setData((c) => c.filter((x) => x.id !== l.id)) } catch (x) { window.alert(api.errorMessage(x)) } } }
  const upload = async (l, file) => { if (file) { try { const u = await api.adminLookImage(l.id, file); setData((c) => c.map((x) => (x.id === u.id ? u : x))) } catch (x) { window.alert(api.errorMessage(x)) } } }
  const clearImg = async (l) => { try { const u = await api.adminRemoveLookImage(l.id); setData((c) => c.map((x) => (x.id === u.id ? u : x))) } catch (x) { window.alert(api.errorMessage(x)) } }
  return (
    <Gate state={state} error={error} reload={reload}>
      <div className="mb-5 flex items-center justify-between"><Title sub="Light, medium and heavy makeup samples. Upload a photo or let GlamHub draw the look from the colours.">Makeup looks</Title><button type="button" className="pill pill-primary" onClick={() => open(null)}>＋ New look</button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((l) => (
          <div key={l.id} className="card overflow-hidden">
            {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="aspect-[5/4] w-full object-cover" /> : <FaceArt preset="natural" look={{ lip: l.lipColor || undefined, eye: l.eyeColor || undefined, blush: l.blushColor || undefined }} className="aspect-[5/4] w-full object-cover" title={l.title} />}
            <div className="space-y-2 p-4">
              <h3 className="font-semibold">{l.title} <span className="chip bg-[#f3ecfd] text-[#5b3fb5]">{l.level}</span></h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="pill !py-1" onClick={() => open(l)}>Edit</button>
                <label className="pill !py-1 cursor-pointer">Upload photo<input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => { upload(l, e.target.files?.[0]); e.target.value = '' }} /></label>
                {l.imageUrl && <button type="button" className="pill !py-1" onClick={() => clearImg(l)}>Remove photo</button>}
                <button type="button" className="pill pill-danger !py-1" onClick={() => remove(l)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Edit look' : 'New look'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Level"><select className="field" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>{['LIGHT', 'MEDIUM', 'HEAVY'].map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Title"><input className="field" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            </div>
            <Field label="Description"><textarea className="field" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Steps (separate with |)"><textarea className="field" rows={3} value={form.steps || ''} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></Field>
            <Field label="Best for"><input className="field" value={form.bestFor || ''} onChange={(e) => setForm({ ...form, bestFor: e.target.value })} /></Field>
            <Field label="Key products"><input className="field" value={form.products || ''} onChange={(e) => setForm({ ...form, products: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              {[['lipColor', 'Lip'], ['eyeColor', 'Eye'], ['blushColor', 'Blush']].map(([k, l]) => <Field key={k} label={l}><input type="color" className="h-10 w-full rounded-full border border-border bg-surface" value={form[k] || '#cccccc'} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>)}
            </div>
            {err && <Notice kind="error">{err}</Notice>}
            <button className="pill pill-primary w-full">Save</button>
          </form>
        </Modal>
      )}
    </Gate>
  )
}

// ---------------- users ----------------
export function AdminUsers() {
  const [role, setRole] = useState('ARTIST')
  const [list, setList] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const load = useCallback(() => {
    setState('loading')
    api.adminUsers(role).then((d) => { setList(d); setState('ready') }).catch((e) => { setError(api.errorMessage(e)); setState('error') })
  }, [role])
  useEffect(() => { load() }, [load])
  const verify = async (u) => { try { const r = await api.adminVerifyUser(u.id); setList((c) => c.map((x) => (x.id === u.id ? r : x))) } catch (e) { window.alert(api.errorMessage(e)) } }
  const drop = async (u, ban) => {
    if (!window.confirm(ban ? `Ban ${u.name}? Their account is deleted and the email can never register again.` : `Delete ${u.name} and all their data?`)) return
    try { await (ban ? api.adminBanUser(u.id) : api.adminDeleteUser(u.id)); setList((c) => c.filter((x) => x.id !== u.id)) } catch (e) { window.alert(api.errorMessage(e)) }
  }
  const shown = (list || []).filter((u) => !q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <Title>User management</Title>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[['ARTIST', 'Artists'], ['CUSTOMER', 'Clients']].map(([k, l]) => <button key={k} type="button" className={`pill !py-1.5 ${role === k ? 'pill-active' : ''}`} onClick={() => setRole(k)}>{l}</button>)}
        <input className="field !w-64" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
      </div>
      <Gate state={state} error={error} reload={load}>
        {shown.length === 0 ? <Empty emoji="👥" title="No users found" /> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border text-ink-muted"><tr><th className="p-3">Name</th><th>Email</th><th>Location</th><th>Joined</th><th className="pr-3 text-right">Actions</th></tr></thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3 font-semibold">{u.name} {u.verified && <span title="Verified" className="text-[#2f8cf0]">✔</span>}</td>
                    <td>{u.email}</td><td>{u.location || '—'}</td><td>{prettyDateTime(u.createdAt).split(',')[0]}</td>
                    <td className="space-x-1 whitespace-nowrap pr-3 text-right">
                      <button type="button" className="pill !py-1" onClick={() => verify(u)}>{u.verified ? 'Unverify' : 'Verify'}</button>
                      <button type="button" className="pill pill-danger !py-1" onClick={() => drop(u, false)}>Delete</button>
                      <button type="button" className="pill pill-danger !py-1" onClick={() => drop(u, true)}>Ban</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Gate>
    </div>
  )
}

// ---------------- deletion requests ----------------
export function AdminDeletionRequests() {
  const { data, setData, state, error, reload } = useLoad(api.adminDeletionRequests)
  const approve = async (r) => {
    if (!window.confirm(`Permanently delete ${r.userName}'s account and data?`)) return
    try { await api.adminApproveDeletion(r.id); setData((c) => c.filter((x) => x.id !== r.id)) } catch (e) { window.alert(api.errorMessage(e)) }
  }
  const reject = async (r) => {
    const note = window.prompt('Note for the user (optional):', '')
    if (note === null) return
    try { await api.adminRejectDeletion(r.id, note); setData((c) => c.map((x) => (x.id === r.id ? { ...x, status: 'REJECTED', adminNote: note } : x))) } catch (e) { window.alert(api.errorMessage(e)) }
  }
  return (
    <Gate state={state} error={error} reload={reload}>
      <Title sub="Approving permanently removes the account and everything attached to it.">Delete account requests</Title>
      {data?.length === 0 ? <Empty emoji="🗑" title="No requests" /> : (
        <div className="space-y-3">
          {data?.map((r) => (
            <article key={r.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><strong>{r.userName}</strong> <span className="text-sm text-ink-muted">{r.userEmail} · {r.userRole}</span></div><StatusChip status={r.status} tintMap={{ PENDING: STATUS_TINT.PENDING, REJECTED: STATUS_TINT.REJECTED }} /></div>
              <p className="mt-1 text-sm">{r.reason || <span className="text-ink-muted">No reason given.</span>}</p>
              <p className="text-xs text-ink-muted">Requested {prettyDateTime(r.createdAt)}{r.adminNote && ` · Note: ${r.adminNote}`}</p>
              {r.status === 'PENDING' && <div className="mt-2 flex gap-2"><button type="button" className="pill pill-danger !py-1" onClick={() => approve(r)}>Approve & delete</button><button type="button" className="pill !py-1" onClick={() => reject(r)}>Decline</button></div>}
            </article>
          ))}
        </div>
      )}
    </Gate>
  )
}

// ---------------- staff (main admin) ----------------
function StaffPage({ role, label }) {
  const { data, setData, state, error, reload } = useLoad(() => api.adminStaff(role))
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [msg, setMsg] = useState(null)
  const add = async (e) => {
    e.preventDefault(); setMsg(null)
    try { const u = await api.adminCreateStaff({ ...form, role }); setData((c) => [u, ...c]); setForm({ name: '', email: '', password: '' }); setMsg({ kind: 'success', text: `${label} created.` }) } catch (x) { setMsg({ kind: 'error', text: api.errorMessage(x) }) }
  }
  const remove = async (u) => { if (window.confirm(`Remove ${u.name}?`)) { try { await api.adminDeleteStaff(u.id); setData((c) => c.filter((x) => x.id !== u.id)) } catch (x) { window.alert(api.errorMessage(x)) } } }
  return (
    <MainOnly>
      <Title sub="Only the main admin can manage staff.">Manage {label.toLowerCase()}s</Title>
      <form onSubmit={add} className="card mb-6 grid gap-3 p-4 md:grid-cols-4">
        <input className="field" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder="Password (min 6)" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="pill pill-primary">Add {label.toLowerCase()}</button>
        {msg && <div className="md:col-span-4"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
      </form>
      <Gate state={state} error={error} reload={reload}>
        {data?.length === 0 ? <Empty emoji="🧑‍💼" title={`No ${label.toLowerCase()}s yet`} /> : (
          <div className="space-y-2">{data?.map((u) => (
            <div key={u.id} className="card flex items-center justify-between p-4"><div><strong>{u.name}</strong> <span className="text-sm text-ink-muted">{u.email}</span> {u.mainAdmin && <span className="chip bg-[#f3ecfd] text-[#5b3fb5]">main admin</span>}</div>
              {!u.mainAdmin && <button type="button" className="pill pill-danger !py-1" onClick={() => remove(u)}>Remove</button>}</div>
          ))}</div>
        )}
      </Gate>
    </MainOnly>
  )
}
export const AdminManageAdmins = () => <StaffPage role="ADMIN" label="Admin" />
export const AdminManageModerators = () => <StaffPage role="MODERATOR" label="Moderator" />

// ---------------- blue badge (main admin) ----------------
export function AdminBlueBadge() {
  const { data, setData, state, error, reload } = useLoad(() => Promise.all([api.adminBadgeSettings(), api.adminBadgeHolders()]))
  const [price, setPrice] = useState('')
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (data) setPrice(String(data[0].price)) }, [data])
  const save = async (e) => {
    e.preventDefault(); setMsg(null)
    try { const r = await api.adminUpdateBadgePrice(Number(price)); setData(([s, h]) => [{ ...s, price: r.price }, h]); setMsg({ kind: 'success', text: 'Price updated.' }) } catch (x) { setMsg({ kind: 'error', text: api.errorMessage(x) }) }
  }
  const revoke = async (h) => { if (window.confirm(`Revoke ${h.artistName}'s badge? No refund is issued.`)) { try { await api.adminRevokeBadge(h.id); setData(([s, list]) => [s, list.map((x) => (x.id === h.id ? { ...x, active: false } : x))]) } catch (x) { window.alert(api.errorMessage(x)) } } }
  return (
    <MainOnly>
      <Gate state={state} error={error} reload={reload}>
        {data && (
          <div className="max-w-3xl">
            <Title sub="Set the price and manage who holds the badge.">Blue badge management</Title>
            <form onSubmit={save} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
              <Field label="Badge price (৳)"><input className="field !w-40" type="number" min="1" step="0.01" required value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
              <button className="pill pill-primary">Save price</button>
              {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            </form>
            {data[1].length === 0 ? <Empty emoji="✔️" title="No badge holders yet" /> : (
              <div className="space-y-2">{data[1].map((h) => (
                <div key={h.id} className="card flex flex-wrap items-center justify-between gap-2 p-4"><div><strong>{h.artistName}</strong> <span className="text-sm text-ink-muted">{h.artistEmail} · {money(h.amountPaid)} · {prettyDateTime(h.purchasedAt)}</span></div>
                  {h.active ? <button type="button" className="pill pill-danger !py-1" onClick={() => revoke(h)}>Revoke</button> : <span className="chip bg-border text-ink">Revoked</span>}</div>
              ))}</div>
            )}
          </div>
        )}
      </Gate>
    </MainOnly>
  )
}

// ---------------- booking money (main admin) ----------------
export function AdminBookingMoney() {
  const { data, state, error, reload } = useLoad(api.adminMoneySettings)
  const [percent, setPercent] = useState('')
  const [saved, setSaved] = useState(null)
  const [msg, setMsg] = useState(null)
  useEffect(() => { if (data) { setPercent(String(data.percent)); setSaved(Number(data.percent)) } }, [data])
  const save = async (e) => {
    e.preventDefault(); setMsg(null)
    try { const r = await api.adminUpdateMoney(Number(percent)); setSaved(Number(r.percent)); setMsg({ kind: 'success', text: 'Saved. It applies to new bookings only — existing bookings keep what they were quoted.' }) } catch (x) { setMsg({ kind: 'error', text: api.errorMessage(x) }) }
  }
  const example = Math.round(10000 * (Number(percent) || 0)) / 100
  return (
    <MainOnly>
      <Gate state={state} error={error} reload={reload}>
        <div className="max-w-xl">
          <Title sub="The percentage of a package price that clients pay online as a deposit.">Booking money</Title>
          <form onSubmit={save} className="card space-y-4 p-6">
            <Field label="Deposit percentage (1–100)" hint={saved != null ? `Currently ${saved}%` : undefined}>
              <input className="field" type="number" min="1" max="100" step="0.01" required value={percent} onChange={(e) => setPercent(e.target.value)} />
            </Field>
            <p className="rounded-2xl bg-surface-raised p-3 text-sm">On a ৳10,000 package the client pays <strong>{money(example)}</strong> online.</p>
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <button className="pill pill-primary">Save booking money</button>
          </form>
        </div>
      </Gate>
    </MainOnly>
  )
}
