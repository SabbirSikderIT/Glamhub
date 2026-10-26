export const money = (n) => `৳${Number(n || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`

export const BUDGETS = {
  LOW: { label: 'Low budget', short: 'Low', hint: 'Under ৳5,000', tint: 'bg-[#e6f6ee] text-[#2f7d5b]' },
  MEDIUM: { label: 'Medium budget', short: 'Medium', hint: '৳5,000 – ৳15,000', tint: 'bg-[#fdeccf] text-[#a46a10]' },
  HIGH: { label: 'High budget', short: 'High', hint: 'Above ৳15,000', tint: 'bg-[#f5dcf3] text-[#9b2f8f]' },
}

export const CATEGORIES = {
  BRIDAL: 'Bridal',
  CASUAL: 'Casual',
  PARTY: 'Party',
  EDITORIAL: 'Editorial',
}

// Local-date strings only: toISOString() would shift the day in UTC+6.
export const toDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const fromDateStr = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const prettyDate = (s) =>
  s ? fromDateStr(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''

export const prettyDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'G'

export const STATUS_TINT = {
  PENDING: 'bg-[#fdeccf] text-[#a46a10]',
  CONFIRMED: 'bg-[#e6f6ee] text-[#2f7d5b]',
  COMPLETED: 'bg-[#e8e2fb] text-[#5b3fb5]',
  CANCELLED: 'bg-[#fde3e8] text-[#b02a47]',
  VERIFIED: 'bg-[#e6f6ee] text-[#2f7d5b]',
  FLAGGED: 'bg-[#fde3e8] text-[#b02a47]',
  APPROVED: 'bg-[#e6f6ee] text-[#2f7d5b]',
  REJECTED: 'bg-[#fde3e8] text-[#b02a47]',
}
