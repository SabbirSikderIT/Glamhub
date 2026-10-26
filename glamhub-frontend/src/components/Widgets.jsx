import { useEffect, useRef, useState } from 'react'
import { Spinner } from './Icons.jsx'

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-muted" role="status">
      <Spinner className="h-6 w-6 text-accent" /> {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="card mx-auto my-8 max-w-lg p-6 text-center" role="alert">
      <p className="mb-3 text-ink">{message || 'Something went wrong.'}</p>
      {onRetry && <button type="button" className="pill pill-primary" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function Empty({ emoji = '💄', title, children }) {
  return (
    <div className="card mx-auto my-6 max-w-lg p-8 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <h3 className="mb-1 text-xl font-semibold">{title}</h3>
      {children && <div className="text-ink-muted">{children}</div>}
    </div>
  )
}

export function Notice({ kind = 'info', children }) {
  const tint = kind === 'error' ? 'bg-[#fde3e8] text-[#9c2340]' : kind === 'success' ? 'bg-[#e6f6ee] text-[#27694c]' : 'bg-[#f3ecfd] text-[#5b3fb5]'
  return <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${tint}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function StarRating({ value = 0, size = 'h-4 w-4', onChange }) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {stars.map((s) => {
        const fill = Math.max(0, Math.min(1, value - (s - 1)))
        const star = (
          <svg viewBox="0 0 24 24" className={size} aria-hidden="true">
            <defs>
              <linearGradient id={`sg-${s}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#f0b429" />
                <stop offset={`${fill * 100}%`} stopColor="#e9d5de" />
              </linearGradient>
            </defs>
            <path fill={`url(#sg-${s}-${Math.round(fill * 100)})`} d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
          </svg>
        )
        return onChange ? (
          <button key={s} type="button" onClick={() => onChange(s)} className="transition-transform hover:scale-125" aria-label={`${s} star${s > 1 ? 's' : ''}`}>{star}</button>
        ) : (
          <span key={s}>{star}</span>
        )
      })}
    </span>
  )
}

export function PasswordField({ value, onChange, placeholder = 'Password', autoComplete = 'current-password', id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} className="field pr-16" value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-accent">{show ? 'Hide' : 'Show'}</button>
    </div>
  )
}

/** Six boxes, auto-advance, paste support. */
export function OtpInput({ value, onChange, length = 6 }) {
  const refs = useRef([])
  const chars = value.padEnd(length, ' ').split('')
  const set = (i, c) => {
    const arr = chars.slice()
    arr[i] = c || ' '
    onChange(arr.join('').trimEnd())
  }
  return (
    <div className="flex justify-center gap-2" onPaste={(e) => {
      const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, length - 1)]?.focus() }
    }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={chars[i].trim()}
          className="field !w-11 !rounded-xl !px-0 text-center text-xl font-bold"
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1)
            set(i, c)
            if (c && i < length - 1) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !chars[i].trim() && i > 0) refs.current[i - 1]?.focus() }}
        />
      ))}
    </div>
  )
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="card max-h-[90vh] w-full max-w-md overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button type="button" className="pill !px-3" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 ml-3 block text-sm font-bold text-ink-muted">{label}</span>
      {children}
      {hint && <span className="ml-3 mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  )
}

export function StatusChip({ status, tintMap }) {
  return <span className={`chip ${tintMap[status] || 'bg-border text-ink'}`}>{status}</span>
}
