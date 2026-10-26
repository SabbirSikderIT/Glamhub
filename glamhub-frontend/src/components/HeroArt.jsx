import { FaceGroup } from './FaceArt.jsx'
import { Sparkle } from './Icons.jsx'

/** The home-page scene: a makeup artist sweeping a brush across a girl's cheek, surrounded by floating beauty tools. */
export default function HeroArt({ className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 640 560" className="h-auto w-full" role="img" aria-label="A makeup artist applying blush to a smiling girl">
        <defs>
          <linearGradient id="hero-blob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffc7dc" />
            <stop offset="1" stopColor="#d8c6ff" />
          </linearGradient>
          <linearGradient id="hero-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c9b2ff" />
            <stop offset="1" stopColor="#a98be8" />
          </linearGradient>
        </defs>

        <circle cx="330" cy="285" r="240" fill="url(#hero-blob)" opacity=".55" className="anim-drift" />
        <circle cx="330" cy="285" r="268" fill="none" stroke="#ee7aa6" strokeOpacity=".4" strokeWidth="2" strokeDasharray="4 14" strokeLinecap="round" />

        {/* the girl */}
        <g transform="translate(300 96) scale(.98)"><FaceGroup skin="#f3c2a3" hair="#3b2024" lip="#c93a68" eye="#d9885f" blush="#f2788c" dress="#fff3f6" intensity={1} stage={4} animate /></g>

        {/* makeup artist */}
        <g>
          <path d="M92 190C60 230 70 330 112 360L150 330C130 290 134 240 150 200Z" fill="#241214" />
          <path d="M70 560C74 440 110 372 160 352L240 352C276 372 296 440 304 560Z" fill="url(#hero-top)" />
          <path d="M160 352L200 410L240 352" fill="#f3c2a3" opacity=".0" />
          <rect x="164" y="318" width="52" height="46" rx="16" fill="#f3c2a3" />
          <ellipse cx="190" cy="262" rx="58" ry="70" fill="#f6cdb0" />
          <path d="M132 250C130 188 250 176 250 252C236 220 206 206 190 204C170 214 146 230 132 250Z" fill="#241214" />
          <path d="M150 250c4-4 10-6 15-4M205 248c4-3 10-4 16 0" stroke="#3b2323" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="170" cy="266" r="4.4" fill="#3b2323" /><circle cx="216" cy="266" r="4.4" fill="#3b2323" />
          <path d="M174 296Q194 312 214 296" stroke="#c4566f" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <circle cx="156" cy="288" r="9" fill="#f2788c" opacity=".45" /><circle cx="228" cy="288" r="9" fill="#f2788c" opacity=".45" />
          {/* tool belt */}
          <rect x="112" y="470" width="150" height="26" rx="13" fill="#7d5bd0" opacity=".55" />
          <rect x="130" y="450" width="10" height="30" rx="4" fill="#ee7aa6" /><rect x="152" y="446" width="10" height="34" rx="4" fill="#f6c453" /><rect x="174" y="452" width="10" height="28" rx="4" fill="#e04b7e" />
          {/* brushing arm */}
          <g style={{ transformOrigin: '212px 372px', animation: 'brush 3.4s ease-in-out infinite' }}>
            <path d="M212 372L276 410L360 330" stroke="#f6cdb0" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M212 372L250 396" stroke="url(#hero-top)" strokeWidth="30" strokeLinecap="round" fill="none" />
            <circle cx="362" cy="328" r="12" fill="#f6cdb0" />
            <path d="M362 328L404 286" stroke="#c4566f" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx="412" cy="278" rx="12" ry="9" fill="#f2788c" transform="rotate(-45 412 278)" />
          </g>
        </g>

        {/* floating tools */}
        <g className="anim-floaty" style={{ transformOrigin: '90px 120px' }}>
          <rect x="70" y="92" width="26" height="46" rx="6" fill="#e04b7e" /><path d="M72 92l11-26 11 26z" fill="#ff8fb3" /><rect x="68" y="136" width="30" height="14" rx="4" fill="#f6c453" />
        </g>
        <g className="anim-floaty" style={{ transformOrigin: '560px 100px', animationDelay: '-2s' }}>
          <rect x="520" y="76" width="82" height="62" rx="16" fill="#fff" stroke="#f4d6e4" strokeWidth="2" />
          {[['#f9b5c8', 540, 96], ['#e86f95', 566, 96], ['#c9b2ff', 592, 96], ['#f6c453', 540, 120], ['#a0d8c0', 566, 120], ['#d8556f', 592, 120]].map(([c, x, y]) => <circle key={x + '' + y} cx={x} cy={y} r="9" fill={c} />)}
        </g>
        <g className="anim-floaty" style={{ transformOrigin: '540px 470px', animationDelay: '-4s' }}>
          <rect x="520" y="440" width="9" height="62" rx="4" fill="#a98be8" transform="rotate(25 524 470)" />
          <ellipse cx="548" cy="434" rx="14" ry="22" fill="#ffc2d6" transform="rotate(25 548 434)" />
        </g>
      </svg>

      {[['8%', '14%', 'h-5 w-5', '0s', 'text-gold'], ['88%', '40%', 'h-4 w-4', '0.8s', 'text-accent'], ['16%', '78%', 'h-6 w-6', '1.4s', 'text-lavender'], ['70%', '88%', 'h-4 w-4', '0.4s', 'text-gold'], ['50%', '4%', 'h-4 w-4', '1.9s', 'text-accent']].map(([l, t, s, d, c]) => (
        <Sparkle key={l + t} className={`anim-twinkle absolute ${s} ${c}`} style={{ left: l, top: t, animationDelay: d }} />
      ))}
    </div>
  )
}
