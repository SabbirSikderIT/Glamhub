import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { homePathFor, useAuth } from '../context/AuthContext.jsx'
import { Field, Notice, OtpInput, PasswordField } from '../components/Widgets.jsx'
import { BUDGETS } from '../utils/format.js'
import {
  adminLogin, errorMessage, forgotPassword, getDistricts, login as apiLogin, registerArtist, registerCustomer,
  resetPassword, verifyResetOtp,
} from '../services/api.js'

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="card anim-rise p-8">
        <h1 className="text-center text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mb-6 mt-1 text-center text-ink-muted">{subtitle}</p>}
        {children}
      </div>
      {footer && <p className="mt-4 text-center text-sm text-ink-muted">{footer}</p>}
    </div>
  )
}

function useSubmit(fn) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (e) => {
    e?.preventDefault()
    setBusy(true); setError('')
    try { await fn() } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return { busy, error, run, setError }
}

export function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useSubmit(async () => {
    const res = await apiLogin(email, password)
    login(res)
    nav(loc.state?.from || homePathFor(res), { replace: true })
  })
  if (user) return <Navigate to={homePathFor(user)} replace />
  return (
    <AuthCard title="Welcome back" subtitle="Log in to your GlamHub account" footer={<>New here? <Link to="/register/user" className="font-bold text-accent no-underline">Create a client account</Link> · <Link to="/register" className="font-bold text-accent no-underline">Join as an artist</Link></>}>
      <form onSubmit={run} className="space-y-4">
        <Field label="Email"><input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><PasswordField value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button className="pill pill-primary w-full !py-3" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="font-bold text-accent no-underline">Forgot your password?</Link></p>
      </form>
    </AuthCard>
  )
}

export function AdminLogin() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { busy, error, run } = useSubmit(async () => {
    const res = await adminLogin(email, password)
    login(res)
    nav('/admin', { replace: true })
  })
  if (user && (user.role === 'ADMIN' || user.role === 'MODERATOR')) return <Navigate to="/admin" replace />
  return (
    <AuthCard title="Staff portal" subtitle="For GlamHub admins and moderators">
      <form onSubmit={run} className="space-y-4">
        <Field label="Staff email"><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><PasswordField value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button className="pill pill-primary w-full !py-3" disabled={busy}>{busy ? 'Checking…' : 'Enter portal'}</button>
      </form>
    </AuthCard>
  )
}

export function RegisterArtist() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [districts, setDistricts] = useState({})
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', district: '', budgetTier: 'MEDIUM' })
  useEffect(() => { getDistricts().then(setDistricts).catch(() => {}) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { busy, error, run } = useSubmit(async () => {
    const res = await registerArtist(f)
    login(res)
    nav('/dashboard', { replace: true })
  })
  return (
    <AuthCard title="Join as an artist" subtitle="Create your GlamHub profile and start getting booked" footer={<>Already registered? <Link to="/login" className="font-bold text-accent no-underline">Log in</Link></>}>
      <form onSubmit={run} className="space-y-4">
        <Field label="Full name"><input className="field" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="field" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="field" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Your district">
          <select className="field" required value={f.district} onChange={set('district')}>
            <option value="">Choose a district</option>
            {Object.entries(districts).map(([division, list]) => <optgroup key={division} label={division}>{list.map((d) => <option key={d}>{d}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Your budget tier" hint="You can change this any time in your profile.">
          <div className="flex gap-2">
            {Object.entries(BUDGETS).map(([k, b]) => <button type="button" key={k} onClick={() => setF({ ...f, budgetTier: k })} className={`pill flex-1 !px-2 ${f.budgetTier === k ? 'pill-active' : ''}`}>{b.short}</button>)}
          </div>
        </Field>
        <Field label="Password"><PasswordField value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button className="pill pill-primary w-full !py-3" disabled={busy}>{busy ? 'Creating…' : 'Create my artist account'}</button>
      </form>
    </AuthCard>
  )
}

export function RegisterUser() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const { busy, error, run } = useSubmit(async () => {
    const res = await registerCustomer(f)
    login(res)
    nav('/account', { replace: true })
  })
  return (
    <AuthCard title="Create your account" subtitle="Keep all your bookings in one place" footer={<>Already registered? <Link to="/login" className="font-bold text-accent no-underline">Log in</Link></>}>
      <form onSubmit={run} className="space-y-4">
        <Field label="Full name"><input className="field" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="field" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Phone"><input className="field" inputMode="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Password"><PasswordField value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
        {error && <Notice kind="error">{error}</Notice>}
        <button className="pill pill-primary w-full !py-3" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
    </AuthCard>
  )
}

export function ForgotPassword() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState('')
  const [pw, setPw] = useState('')
  const [done, setDone] = useState(false)

  const s1 = useSubmit(async () => { await forgotPassword(email); setStep(1) })
  const s2 = useSubmit(async () => { const r = await verifyResetOtp(email, otp); setToken(r.resetToken); setStep(2) })
  const s3 = useSubmit(async () => { await resetPassword(token, pw); setDone(true); setTimeout(() => nav('/login'), 1800) })

  return (
    <AuthCard title="Reset your password" subtitle={['Enter your account email', 'Enter the 6-digit code we sent', 'Choose a new password'][step]}>
      {done ? <Notice kind="success">Password updated! Taking you to log in…</Notice> : step === 0 ? (
        <form onSubmit={s1.run} className="space-y-4">
          <Field label="Email"><input className="field" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {s1.error && <Notice kind="error">{s1.error}</Notice>}
          <button className="pill pill-primary w-full !py-3" disabled={s1.busy}>{s1.busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : step === 1 ? (
        <form onSubmit={s2.run} className="space-y-4">
          <Notice kind="info">If that email is registered, a code is on its way.</Notice>
          <OtpInput value={otp} onChange={setOtp} />
          {s2.error && <Notice kind="error">{s2.error}</Notice>}
          <button className="pill pill-primary w-full !py-3" disabled={s2.busy || otp.length < 6}>{s2.busy ? 'Checking…' : 'Verify code'}</button>
        </form>
      ) : (
        <form onSubmit={s3.run} className="space-y-4">
          <Field label="New password"><PasswordField value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
          {s3.error && <Notice kind="error">{s3.error}</Notice>}
          <button className="pill pill-primary w-full !py-3" disabled={s3.busy}>{s3.busy ? 'Saving…' : 'Update password'}</button>
        </form>
      )}
    </AuthCard>
  )
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <div className="text-6xl">💄</div>
      <h1 className="mt-2 text-4xl font-bold">Page not found</h1>
      <p className="mt-2 text-ink-muted">We couldn't find that page. It may have moved — let's get you back to something beautiful.</p>
      <Link to="/" className="pill pill-primary mt-5">Go home</Link>
    </div>
  )
}
