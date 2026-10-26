import { useId } from 'react'

/**
 * Illustrated portrait that is drawn from makeup colours. `stage` (0-4) reveals the makeup layer by layer:
 * 1 base + glow, 2 eyes, 3 blush + contour, 4 lips. `stage = 4` is the full look.
 * Coordinates live in a 300 x 360 box so the same group can be reused inside bigger scenes.
 */
export const LOOK_PRESETS = {
  bridal: { label: 'Bridal glam', skin: '#f3c2a3', hair: '#2e1a1c', lip: '#b3304f', eye: '#c08a62', blush: '#ef8a96', dress: '#fff4f1', accessory: 'veil', bg: ['#ffe4ee', '#f6d3f0'], intensity: 1 },
  casual: { label: 'Fresh casual', skin: '#f6cdb0', hair: '#6b3d2a', lip: '#e58c93', eye: '#d9b8a4', blush: '#f4b0a6', dress: '#bfa5f2', accessory: 'none', bg: ['#fff0e3', '#ffe0ea'], intensity: 0.55 },
  party: { label: 'Party glam', skin: '#e3a98a', hair: '#1c1114', lip: '#9b1d45', eye: '#7a4b78', blush: '#d96b84', dress: '#3a2352', accessory: 'earrings', bg: ['#e4d8ff', '#ffd3e6'], intensity: 0.9 },
  golden: { label: 'Golden glow', skin: '#c98f68', hair: '#241415', lip: '#c4566f', eye: '#d99a3d', blush: '#e08a6a', dress: '#f5c55c', accessory: 'earrings', bg: ['#fff2cc', '#ffdfe9'], intensity: 0.85 },
  natural: { label: 'Natural dew', skin: '#f8d6bf', hair: '#a7613f', lip: '#e9959c', eye: '#e6c9b4', blush: '#f7b9aa', dress: '#a8d8c5', accessory: 'flower', bg: ['#e5f7ee', '#fde6ee'], intensity: 0.4 },
  editorial: { label: 'Editorial pop', skin: '#a9704f', hair: '#120c0e', lip: '#7d1f4a', eye: '#2f5d8a', blush: '#d46a8c', dress: '#e84a8a', accessory: 'earrings', bg: ['#d7ecff', '#f3d6ff'], intensity: 1 },
}

function layerStyle(on, delay = 0) {
  return { opacity: on ? 1 : 0, transition: `opacity .9s ease ${delay}s` }
}

export function FaceGroup({ skin = '#f3c2a3', hair = '#2e1a1c', lip = '#b3304f', eye = '#c08a62', blush = '#ef8a96', dress = '#bfa5f2', accessory = 'none', intensity = 1, stage = 4, animate = false }) {
  const uid = useId().replace(/:/g, '')
  const on = (n) => stage >= n
  const i = intensity
  return (
    <g>
      <defs>
        <radialGradient id={`bl-${uid}`}>
          <stop offset="0" stopColor={blush} stopOpacity="0.85" />
          <stop offset="1" stopColor={blush} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`gl-${uid}`} cx="50%" cy="38%" r="60%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* hair behind */}
      <path d="M68 150C58 36 242 36 232 150C240 232 256 300 226 340L74 340C44 300 60 232 68 150Z" fill={hair} />
      {accessory === 'veil' && <path d="M60 80C100 20 200 20 240 80C262 200 258 300 250 340L50 340C42 300 38 200 60 80Z" fill="#fff" opacity=".28" />}
      {/* neck + dress */}
      <rect x="128" y="212" width="44" height="66" rx="14" fill={skin} />
      <rect x="128" y="236" width="44" height="30" rx="14" fill="#000" opacity=".08" />
      <path d="M18 360C28 300 88 274 126 268L174 268C212 274 272 300 282 360Z" fill={dress} />
      <path d="M126 268Q150 296 174 268" fill={skin} />
      {/* ears + earrings */}
      <ellipse cx="82" cy="158" rx="9" ry="14" fill={skin} />
      <ellipse cx="218" cy="158" rx="9" ry="14" fill={skin} />
      {accessory === 'earrings' && (<>
        <circle cx="82" cy="180" r="6" fill="#f4c95d" /><circle cx="218" cy="180" r="6" fill="#f4c95d" />
        <circle cx="82" cy="192" r="3.5" fill="#f4c95d" opacity=".8" /><circle cx="218" cy="192" r="3.5" fill="#f4c95d" opacity=".8" />
      </>)}
      {/* face */}
      <ellipse cx="150" cy="150" rx="68" ry="86" fill={skin} />
      <g style={layerStyle(on(1))}>
        <ellipse cx="150" cy="140" rx="64" ry="80" fill={`url(#gl-${uid})`} />
        <ellipse cx="108" cy="176" rx="16" ry="6" fill="#fff" opacity=".28" transform="rotate(-18 108 176)" />
        <ellipse cx="192" cy="176" rx="16" ry="6" fill="#fff" opacity=".28" transform="rotate(18 192 176)" />
      </g>
      {/* eyes */}
      <g style={layerStyle(on(2))}>
        <ellipse cx="120" cy="142" rx="21" ry="10" fill={eye} opacity={0.55 + 0.4 * i} />
        <ellipse cx="180" cy="142" rx="21" ry="10" fill={eye} opacity={0.55 + 0.4 * i} />
        <path d="M100 150Q120 140 138 148" stroke="#1a0f12" strokeWidth={2 + i * 1.6} fill="none" strokeLinecap="round" />
        <path d="M200 150Q180 140 162 148" stroke="#1a0f12" strokeWidth={2 + i * 1.6} fill="none" strokeLinecap="round" />
        <path d="M137 148L146 141M163 148L154 141" stroke="#1a0f12" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g style={animate ? { transformOrigin: '150px 152px', animation: 'blink 5s infinite' } : undefined}>
        <path d="M105 152Q120 142 135 152Q120 159 105 152Z" fill="#fff" />
        <path d="M165 152Q180 142 195 152Q180 159 165 152Z" fill="#fff" />
        <circle cx="120" cy="152" r="5.2" fill="#3b2323" /><circle cx="180" cy="152" r="5.2" fill="#3b2323" />
        <circle cx="121.8" cy="150.3" r="1.5" fill="#fff" /><circle cx="181.8" cy="150.3" r="1.5" fill="#fff" />
        <path d="M104 150Q120 139 136 150M164 150Q180 139 196 150" stroke="#1a0f12" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
      <path d="M100 128Q120 117 140 126M160 126Q180 117 200 128" stroke={hair} strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".9" />
      {/* nose */}
      <path d="M150 160Q144 182 149 188Q156 191 160 186" stroke="#000" strokeOpacity=".16" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* blush + contour */}
      <g style={layerStyle(on(3))}>
        <circle cx="106" cy="184" r="26" fill={`url(#bl-${uid})`} opacity={0.5 + 0.5 * i} style={animate ? { animation: 'pulseBlush 3.2s ease-in-out infinite' } : undefined} />
        <circle cx="194" cy="184" r="26" fill={`url(#bl-${uid})`} opacity={0.5 + 0.5 * i} style={animate ? { animation: 'pulseBlush 3.2s ease-in-out infinite' } : undefined} />
        <path d="M84 170Q92 196 112 214M216 170Q208 196 188 214" stroke="#000" strokeOpacity=".08" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
      {/* lips */}
      <path d="M127 205Q138 196 150 201Q162 196 173 205Q150 213 127 205Z" fill="#d98a86" />
      <path d="M127 205Q150 213 173 205Q165 226 150 227Q135 226 127 205Z" fill="#e39a95" />
      <g style={layerStyle(on(4))}>
        <path d="M127 205Q138 196 150 201Q162 196 173 205Q150 213 127 205Z" fill={lip} />
        <path d="M127 205Q150 213 173 205Q165 226 150 227Q135 226 127 205Z" fill={lip} opacity=".88" />
        <ellipse cx="150" cy="216" rx="8" ry="2.6" fill="#fff" opacity=".35" />
      </g>
      {/* hair in front */}
      <path d="M78 134C80 58 220 58 222 134C204 98 172 82 150 76C128 92 100 112 78 134Z" fill={hair} />
      {accessory === 'flower' && (<g transform="translate(206 92)">
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-10" rx="6" ry="10" fill="#ffd1df" transform={`rotate(${a})`} />)}
        <circle r="5" fill="#f4c95d" />
      </g>)}
      {accessory === 'veil' && <path d="M96 78Q150 56 204 78" stroke="#f4c95d" strokeWidth="5" fill="none" strokeLinecap="round" />}
    </g>
  )
}

export default function FaceArt({ preset = 'bridal', look, stage = 4, className = '', animate = false, title }) {
  const p = { ...(LOOK_PRESETS[preset] || LOOK_PRESETS.bridal), ...(look || {}) }
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 300 360" className={className} role="img" aria-label={title || p.label}>
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={p.bg[0]} />
          <stop offset="1" stopColor={p.bg[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="360" fill={`url(#bg-${uid})`} />
      <circle cx="40" cy="60" r="34" fill="#fff" opacity=".35" />
      <circle cx="262" cy="300" r="46" fill="#fff" opacity=".25" />
      <FaceGroup {...p} stage={stage} animate={animate} />
    </svg>
  )
}
