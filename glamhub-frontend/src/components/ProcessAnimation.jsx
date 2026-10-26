import { useEffect, useState } from 'react'
import FaceArt from './FaceArt.jsx'

const STEPS = [
  { title: 'Skin prep & base', text: 'Cleanse, moisturise and prime, then a flawless base is blended for an even, glowing canvas.' },
  { title: 'Eyes', text: 'Shadow, liner and lashes are chosen to suit your eye shape and your outfit.' },
  { title: 'Cheeks & contour', text: 'A touch of blush and soft sculpting lifts and warms the face.' },
  { title: 'Lips & finish', text: 'The perfect lip colour and a setting mist lock the look in for the whole event.' },
]

/** A face that gets its makeup one layer at a time, with the matching step highlighted. */
export default function ProcessAnimation({ preset = 'bridal' }) {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStage((s) => (s + 1) % 6), 2100)
    return () => clearInterval(t)
  }, [])
  const shown = Math.min(stage, 4)
  const active = Math.min(Math.max(shown - 1, 0), 3)

  return (
    <div className="grid items-center gap-8 md:grid-cols-2">
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] shadow-hover">
        <FaceArt preset={preset} stage={shown} className="h-auto w-full" animate title="A face being made up step by step" />
      </div>
      <ol className="space-y-3">
        {STEPS.map((s, i) => {
          const on = shown > 0 && i === active
          return (
            <li key={s.title} className={`card flex gap-4 p-4 transition-all duration-500 ${on ? 'scale-[1.02] !border-accent shadow-hover' : 'opacity-75'}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${on ? 'bg-brand' : 'bg-border text-ink-muted'}`}>{i + 1}</span>
              <div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-ink-muted">{s.text}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
