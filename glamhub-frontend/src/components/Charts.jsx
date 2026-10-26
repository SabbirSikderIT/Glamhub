/** Hand-built SVG charts with nice-number axes, direct labels, and an accessible hidden data table. */
function niceMax(v) {
  if (v <= 0) return 5
  const exp = 10 ** Math.floor(Math.log10(v))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * exp
}

export function BarChart({ data, title, color = 'var(--color-accent)', format = (v) => v }) {
  const W = 480, H = 220, pad = { l: 44, r: 10, t: 18, b: 30 }
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t)
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length)
  return (
    <figure className="card p-4">
      <figcaption className="mb-2 font-display text-lg font-semibold">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {ticks.map((t) => {
          const y = pad.t + (H - pad.t - pad.b) * (1 - t / max)
          return (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="3 4" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--color-ink-muted)">{format(Math.round(t))}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const h = (H - pad.t - pad.b) * (d.value / max)
          const x = pad.l + i * bw + bw * 0.18
          const y = H - pad.b - h
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={bw * 0.64} height={Math.max(h, 0)} rx="6" fill={color} opacity=".9"><title>{`${d.label}: ${format(d.value)}`}</title></rect>
              {d.value > 0 && <text x={x + bw * 0.32} y={y - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-ink)">{format(d.value)}</text>}
              <text x={x + bw * 0.32} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-ink-muted)">{d.label}</text>
            </g>
          )
        })}
      </svg>
      <table className="sr-only"><caption>{title}</caption><tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{format(d.value)}</td></tr>)}</tbody></table>
    </figure>
  )
}

const PALETTE = ['#d6457f', '#a98be8', '#e6b35c', '#7fc8a9', '#ee7aa6', '#6b9be8']

export function DonutChart({ data, title }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const R = 54, C = 2 * Math.PI * R
  let offset = 0
  return (
    <figure className="card p-4">
      <figcaption className="mb-2 font-display text-lg font-semibold">{title}</figcaption>
      {total === 0 ? <p className="py-8 text-center text-sm text-ink-muted">Nothing to show yet.</p> : (
        <div className="flex flex-wrap items-center gap-4">
          <svg viewBox="0 0 140 140" className="h-36 w-36" role="img" aria-label={title}>
            <g transform="rotate(-90 70 70)">
              {data.map((d, i) => {
                const len = (d.value / total) * C
                const el = <circle key={d.label} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset}><title>{`${d.label}: ${d.value}`}</title></circle>
                offset += len
                return el
              })}
            </g>
            <text x="70" y="75" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--color-ink)">{total}</text>
          </svg>
          <ul className="space-y-1 text-sm">
            {data.map((d, i) => <li key={d.label} className="flex items-center gap-2"><i className="inline-block h-3 w-3 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{d.label} <strong>{d.value}</strong></li>)}
          </ul>
        </div>
      )}
    </figure>
  )
}
