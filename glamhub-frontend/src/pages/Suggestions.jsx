import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FaceArt from '../components/FaceArt.jsx'
import { Empty, ErrorBox, Loading } from '../components/Widgets.jsx'
import { errorMessage, getLooks, getPalettes } from '../services/api.js'

const LEVELS = { LIGHT: { label: 'Light', emoji: '🌸', blurb: 'Natural, breathable, skin-first.' }, MEDIUM: { label: 'Medium', emoji: '💖', blurb: 'Polished, defined, camera-friendly.' }, HEAVY: { label: 'Heavy', emoji: '👑', blurb: 'Full glam, long-wear, dramatic.' } }
const SKIN = { ALL: 'All skin tones', FAIR: 'Fair', MEDIUM: 'Medium', DEEP: 'Deep' }

export default function Suggestions() {
  const [topic, setTopic] = useState('palettes')
  const [palettes, setPalettes] = useState([])
  const [looks, setLooks] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const [occasion, setOccasion] = useState('')
  const [level, setLevel] = useState('LIGHT')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    Promise.all([getPalettes(), getLooks()]).then(([p, l]) => { setPalettes(p); setLooks(l); setState('ready') })
      .catch((e) => { setError(errorMessage(e)); setState('error') })
  }, [])

  const occasions = useMemo(() => [...new Set(palettes.map((p) => p.occasion).filter(Boolean))], [palettes])
  const shownPalettes = occasion ? palettes.filter((p) => p.occasion === occasion) : palettes
  const shownLooks = looks.filter((l) => l.level === level)

  const copy = (hex) => {
    navigator.clipboard?.writeText(hex).then(() => { setCopied(hex); setTimeout(() => setCopied(''), 1200) }).catch(() => {})
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:px-12">
      <h1 className="text-center text-4xl font-bold">Makeup <span className="text-brand">suggestions</span></h1>
      <p className="mx-auto mb-6 mt-2 max-w-xl text-center text-ink-muted">Find colours that flatter you and a look level that fits the occasion, then book an artist who can make it happen.</p>

      <div className="mb-8 flex justify-center gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={topic === 'palettes'} className={`pill ${topic === 'palettes' ? 'pill-active' : ''}`} onClick={() => setTopic('palettes')}>🎨 Colour palette details</button>
        <button type="button" role="tab" aria-selected={topic === 'looks'} className={`pill ${topic === 'looks' ? 'pill-active' : ''}`} onClick={() => setTopic('looks')}>💄 Makeup sample details</button>
      </div>

      {state === 'loading' && <Loading />}
      {state === 'error' && <ErrorBox message={error} />}

      {state === 'ready' && topic === 'palettes' && (
        <>
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <button type="button" className={`pill !py-1.5 ${!occasion ? 'pill-active' : ''}`} onClick={() => setOccasion('')}>All occasions</button>
            {occasions.map((o) => <button key={o} type="button" className={`pill !py-1.5 ${occasion === o ? 'pill-active' : ''}`} onClick={() => setOccasion(o)}>{o}</button>)}
          </div>
          {shownPalettes.length === 0 ? <Empty emoji="🎨" title="No palettes yet">Check back soon — we add new palettes regularly.</Empty> : (
            <div className="grid gap-5 md:grid-cols-2">
              {shownPalettes.map((p) => {
                const colors = (p.swatches || '').split(',')
                const names = (p.swatchNames || '').split(',')
                return (
                  <article key={p.id} className="card card-hover overflow-hidden">
                    <div className="flex h-24" role="list">
                      {colors.map((c, i) => (
                        <button key={c + i} type="button" role="listitem" onClick={() => copy(c)} className="group relative flex-1 transition-all hover:flex-[1.6]" style={{ background: c }} aria-label={`${names[i] || c} ${c}, click to copy`}>
                          <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-bold text-white opacity-0 mix-blend-difference group-hover:opacity-100">{copied === c ? 'copied!' : c}</span>
                        </button>
                      ))}
                    </div>
                    <div className="p-5">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold">{p.name}</h2>
                        {p.occasion && <span className="chip bg-[#f3ecfd] text-[#5b3fb5]">{p.occasion}</span>}
                        {p.skinTone && <span className="chip bg-border text-ink">{SKIN[p.skinTone] || p.skinTone}</span>}
                      </div>
                      <p className="text-sm text-ink-muted">{p.description}</p>
                      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                        {colors.map((c, i) => <li key={c + i} className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1"><i className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />{names[i] || c}</li>)}
                      </ul>
                      {p.tips && <p className="mt-3 rounded-xl bg-surface-raised p-3 text-sm"><strong>💡 Tip:</strong> {p.tips}</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {state === 'ready' && topic === 'looks' && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {Object.entries(LEVELS).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setLevel(k)} className={`card card-hover p-4 text-center ${level === k ? '!border-accent shadow-hover' : ''}`} aria-pressed={level === k}>
                <div className="text-3xl">{l.emoji}</div>
                <h2 className="text-xl font-bold">{l.label} makeup</h2>
                <p className="text-sm text-ink-muted">{l.blurb}</p>
              </button>
            ))}
          </div>
          {shownLooks.length === 0 ? <Empty emoji="💄" title="No samples yet">We're adding {LEVELS[level].label.toLowerCase()} makeup samples soon.</Empty> : (
            <div className="space-y-6">
              {shownLooks.map((l) => (
                <article key={l.id} className="card grid items-center gap-6 overflow-hidden p-5 md:grid-cols-[260px_1fr]">
                  <div className="overflow-hidden rounded-2xl">
                    {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="aspect-[5/6] w-full object-cover" /> :
                      <FaceArt preset={l.level === 'LIGHT' ? 'natural' : l.level === 'MEDIUM' ? 'party' : 'bridal'} look={{ lip: l.lipColor || undefined, eye: l.eyeColor || undefined, blush: l.blushColor || undefined, intensity: l.level === 'LIGHT' ? 0.4 : l.level === 'MEDIUM' ? 0.8 : 1 }} className="aspect-[5/6] w-full" title={l.title} />}
                  </div>
                  <div>
                    <span className="chip bg-[#f3ecfd] text-[#5b3fb5]">{LEVELS[l.level].label}</span>
                    <h2 className="mt-1 text-2xl font-bold">{l.title}</h2>
                    <p className="mt-1 text-ink-muted">{l.description}</p>
                    {l.steps && (
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{l.steps.split('|').map((s) => <li key={s}>{s}</li>)}</ol>
                    )}
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {l.bestFor && <div><dt className="font-bold text-accent">Best for</dt><dd className="text-ink-muted">{l.bestFor}</dd></div>}
                      {l.products && <div><dt className="font-bold text-accent">Key products</dt><dd className="text-ink-muted">{l.products}</dd></div>}
                    </dl>
                    <Link to="/search" className="pill pill-primary mt-4">Find an artist for this look</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
