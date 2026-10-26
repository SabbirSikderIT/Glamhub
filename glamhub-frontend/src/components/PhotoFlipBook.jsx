import { useEffect, useState } from 'react'
import FaceArt from './FaceArt.jsx'
import { optimize } from '../utils/cdn.js'

/**
 * A stack of look "cards" that change with a rotating set of transition styles (see .flip-in-* in index.css).
 * Each slide is either { type: 'photo', url, caption, artist } or { type: 'art', preset, caption }.
 */
export default function PhotoFlipBook({ slides, interval = 3800, className = '' }) {
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState(null)
  const count = slides.length

  useEffect(() => {
    if (count < 2) return undefined
    const t = setInterval(() => {
      setIndex((cur) => {
        setPrev(cur)
        return (cur + 1) % count
      })
    }, interval)
    return () => clearInterval(t)
  }, [count, interval])

  useEffect(() => {
    if (prev === null) return undefined
    const t = setTimeout(() => setPrev(null), 1300)
    return () => clearTimeout(t)
  }, [prev])

  if (!count) return null
  const safeIndex = index % count

  const render = (s) =>
    s.type === 'photo' ? (
      <img src={optimize(s.url, 900)} alt={s.caption || 'Makeup look by a GlamHub artist'} className="h-full w-full object-cover" loading="lazy" />
    ) : (
      <FaceArt preset={s.preset} className="h-full w-full object-cover" stage={4} />
    )

  return (
    <div className={`relative aspect-[5/6] w-full overflow-hidden rounded-[2rem] shadow-hover ${className}`}>
      {prev !== null && prev !== safeIndex && slides[prev] && <div className="absolute inset-0" aria-hidden="true">{render(slides[prev])}</div>}
      <div key={safeIndex} className={`absolute inset-0 ${prev !== null ? `flip-in-${safeIndex % 4}` : ''}`}>
        {render(slides[safeIndex])}
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 pt-16 text-white">
        <p className="font-display text-xl font-semibold">{slides[safeIndex].caption}</p>
        {slides[safeIndex].artist && <p className="text-sm opacity-90">by {slides[safeIndex].artist}</p>}
      </div>
      <div className="absolute right-4 top-4 flex gap-1.5" aria-hidden="true">
        {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full bg-white transition-all ${i === safeIndex ? 'w-6 opacity-100' : 'w-1.5 opacity-50'}`} />)}
      </div>
    </div>
  )
}
