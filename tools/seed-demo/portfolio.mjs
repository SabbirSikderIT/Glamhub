// Uploads 15 portfolio photos (4/4/4/3 across bridal, casual, party, editorial) to every demo artist, through the real API.
// Photos come from ./portfolio (see CREDITS.md). Resumable: artists that already have 15 photos are skipped.
//   node portfolio.mjs            run for all demo artists
//   node portfolio.mjs 5          only the first 5 artists (test)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API || 'https://glamhub-backend-g0q4.onrender.com/api'
const here = path.dirname(fileURLToPath(import.meta.url))
const POOL = JSON.parse(fs.readFileSync(path.join(here, 'pool.json'), 'utf8'))
const CATS = ['BRIDAL', 'CASUAL', 'PARTY', 'EDITORIAL']
const CAPTIONS = {
  BRIDAL: ['Bridal makeup', 'Wedding day glam', 'Traditional bridal look', 'Bridal HD finish', 'Bride-to-be portrait'],
  CASUAL: ['Soft everyday look', 'Natural glow', 'Fresh daytime makeup', 'Minimal makeup', 'Dewy skin finish'],
  PARTY: ['Party glam', 'Evening look', 'Bold lips', 'Smoky eyes', 'Reception makeup'],
  EDITORIAL: ['Editorial concept', 'Creative colour story', 'Photoshoot makeup', 'Artistic makeup', 'Fashion editorial'],
}
const byCat = Object.fromEntries(CATS.map((c) => [c, POOL.filter((p) => p.cat === c)]))

async function call(method, url, { token, json, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers['Content-Type'] = 'application/json'
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API + url, { method, headers, body: json ? JSON.stringify(json) : form })
      const text = await res.text(); let data = null; try { data = JSON.parse(text) } catch { /* */ }
      return { ok: res.ok, status: res.status, data }
    } catch (e) { await new Promise((r) => setTimeout(r, 2000)) }
  }
  return { ok: false, status: 0, data: null }
}

function plan(n) { // n = 1-based artist number; 4/4/4/3 with the "short" category rotating
  const short = n % 4
  const out = []
  CATS.forEach((cat, ci) => {
    const count = ci === short ? 3 : 4
    const list = byCat[cat]
    for (let k = 0; k < count; k++) out.push(list[(n * 4 + k * 7 + ci) % list.length])
  })
  // never the same photo twice on one profile
  const seen = new Set(); return out.filter((p) => !seen.has(p.id) && seen.add(p.id))
}

const admin = (await call('POST', '/auth/admin-login', { json: { email: 'admin@glamhub.com', password: 'Admin@12345' } })).data.token
const users = ((await call('GET', '/admin/users?role=ARTIST', { token: admin })).data || []).filter((u) => u.email.endsWith('@glamhub-demo.com')).sort((a, b) => a.id - b.id)
const limit = Number(process.argv[2]) || users.length
const stats = { uploaded: 0, verified: 0, flaggedApproved: 0, failed: 0, skipped: 0 }
let next = 0

async function doArtist(u, n) {
  const login = await call('POST', '/auth/login', { json: { email: u.email, password: 'Demo@12345' } })
  const token = login.data?.token
  if (!token) { stats.failed++; return }
  const existing = (await call('GET', '/portfolio', { token })).data || []
  if (existing.length >= 15) { stats.skipped++; return }
  for (const e of existing) await call('DELETE', `/portfolio/${e.id}`, { token })
  let i = 0
  for (const p of plan(n)) {
    const fd = new FormData()
    fd.append('file', new Blob([fs.readFileSync(path.join(here, 'portfolio', `${p.id}.jpg`))], { type: 'image/jpeg' }), `look-${p.id}.jpg`)
    fd.append('category', p.cat)
    fd.append('caption', CAPTIONS[p.cat][(n + i++) % 5])
    const r = await call('POST', '/portfolio', { token, form: fd })
    if (!r.ok) { stats.failed++; console.log(`  upload failed ${u.name}: ${r.data?.message}`); continue }
    stats.uploaded++
    if (r.data.verificationStatus === 'VERIFIED') stats.verified++
    else { // vetted real photo flagged by the AI (false positive) or already on another profile: approve as admin
      const a = await call('PUT', `/admin/photos/${r.data.id}/approve`, { token: admin })
      if (a.ok) stats.flaggedApproved++
    }
  }
  console.log(`done #${n} ${u.name} | uploaded ${stats.uploaded} verified ${stats.verified} approved ${stats.flaggedApproved} failed ${stats.failed}`)
}

await Promise.all(Array.from({ length: 4 }, async () => { while (next < Math.min(limit, users.length)) { const idx = next++; await doArtist(users[idx], idx + 1) } }))
console.log('FINISHED', JSON.stringify(stats))
