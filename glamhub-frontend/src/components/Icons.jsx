export function BlueCheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Verified artist" role="img">
      <path fill="#2f8cf0" d="M12 1.8l2.4 1.7 2.9-.2 1 2.7 2.5 1.5-.7 2.8 1.1 2.7-2 2.1-.3 2.9-2.8.8-1.7 2.4-2.7-1.1-2.7 1.1-1.7-2.4-2.8-.8-.3-2.9-2-2.1 1.1-2.7-.7-2.8 2.5-1.5 1-2.7 2.9.2z" />
      <path d="M8 12.3l2.7 2.7 5.3-5.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function AiSparkIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z" />
      <path fill="currentColor" opacity=".7" d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" />
    </svg>
  )
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Sparkle({ className = '', style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden="true">
      <path fill="currentColor" d="M12 0l2.4 9.6L24 12l-9.6 2.4L12 24l-2.4-9.6L0 12l9.6-2.4z" />
    </svg>
  )
}
