import { useMemo, useState } from 'react'
import { toDateStr } from '../utils/format.js'

/**
 * Month calendar. `statuses` maps 'YYYY-MM-DD' -> FREE | BOOKED | BLOCKED (missing = FREE).
 * `onSelect(dateStr, status)` makes it interactive; past dates are never selectable.
 */
export default function AvailabilityCalendar({ statuses = {}, onSelect, selected, onMonthChange }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const today = toDateStr(new Date())

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const arr = Array(first.getDay()).fill(null)
    for (let d = 1; d <= days; d++) arr.push(toDateStr(new Date(month.getFullYear(), month.getMonth(), d)))
    return arr
  }, [month])

  const go = (delta) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1)
    setMonth(next)
    onMonthChange?.(next)
  }

  const tone = (s, past, sel) => {
    if (sel) return 'bg-brand shadow-card ring-2 ring-accent/40'
    if (past) return 'text-ink-muted/40'
    if (s === 'BOOKED') return 'bg-booked/20 text-booked'
    if (s === 'BLOCKED') return 'bg-border text-ink-muted line-through'
    return 'bg-free/20 text-ink hover:ring-2 hover:ring-free'
  }

  return (
    <div className="card p-4" aria-label="Availability calendar">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="pill !px-3" onClick={() => go(-1)} aria-label="Previous month">‹</button>
        <h3 className="text-lg font-semibold">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
        <button type="button" className="pill !px-3" onClick={() => go(1)} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-ink-muted">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((ds, i) => {
          if (!ds) return <div key={`e${i}`} />
          const past = ds < today
          const st = statuses[ds] || 'FREE'
          const interactive = onSelect && !past
          return (
            <button
              key={ds}
              type="button"
              disabled={!interactive}
              onClick={() => onSelect(ds, st)}
              aria-label={`${ds} ${past ? 'past' : st.toLowerCase()}`}
              aria-pressed={selected === ds}
              className={`aspect-square rounded-xl text-sm font-bold transition ${tone(st, past, selected === ds)} ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {Number(ds.slice(8))}
            </button>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-free/50" /> Available</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-booked/50" /> Booked</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded bg-border" /> Unavailable</span>
      </div>
    </div>
  )
}
