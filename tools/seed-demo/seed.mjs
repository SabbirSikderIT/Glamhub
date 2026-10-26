// GlamHub demo-data seeder.
//   node seed.mjs faces            download real placeholder portraits into ./faces
//   node seed.mjs faces 3,17       re-generate only those artist numbers
//   node seed.mjs sheet            print the artist list (number, name, district)
//   node seed.mjs seed             register the artists, upload photos, add packages, verify some
//   node seed.mjs clean            remove every demo artist (accounts ending @glamhub-demo.com)
// Needs the backend running on API (default http://localhost:8080/api) and the main admin account.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API = process.env.API || 'http://localhost:8080/api'
const ADMIN = { email: process.env.ADMIN_EMAIL || 'admin@glamhub.com', password: process.env.ADMIN_PASSWORD || 'Admin@12345' }
const PASSWORD = 'Demo@12345'
const DOMAIN = 'glamhub-demo.com'
const here = path.dirname(fileURLToPath(import.meta.url))
const FACES = path.join(here, 'faces')

// ---------- deterministic randomness so artist N always keeps the same name and photo ----------
function rng(seed) { // mulberry32
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const rand = rng(20261026)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const between = (a, b) => a + Math.floor(rand() * (b - a + 1))

const MUSLIM_FIRST = ['Nusrat', 'Farhana', 'Sumaiya', 'Tasnim', 'Mahjabin', 'Rumana', 'Shirin', 'Nazia', 'Sadia', 'Jannatul', 'Tahmina', 'Lamia', 'Sharmin', 'Afrin', 'Sabrina', 'Ishrat', 'Anika', 'Tamanna', 'Nabila', 'Fariha', 'Samira', 'Rubina', 'Salma', 'Nafisa', 'Tania', 'Aklima', 'Shabnam', 'Jesmin', 'Rokeya', 'Nasrin', 'Shahnaz', 'Laboni', 'Sonia', 'Nipa', 'Sumona', 'Tonni', 'Raisa', 'Ayesha', 'Mahfuza', 'Nahida', 'Rabeya', 'Shapla', 'Dilruba', 'Humayra', 'Sanjida', 'Maliha', 'Zannat', 'Roksana', 'Shamima', 'Mahmuda', 'Farzana', 'Razia', 'Mehnaz', 'Sabiha', 'Tabassum', 'Munira', 'Khadija', 'Israt', 'Sultana', 'Bushra', 'Orin', 'Mim', 'Moriom', 'Sheuli', 'Nodi', 'Urmi']
const MUSLIM_LAST = ['Akter', 'Khanam', 'Begum', 'Chowdhury', 'Rahman', 'Islam', 'Sultana', 'Jahan', 'Haque', 'Siddique', 'Khatun', 'Parvin', 'Hossain', 'Ahmed', 'Karim', 'Zaman', 'Mondal', 'Sheikh', 'Bhuiyan', 'Talukder', 'Mim', 'Yasmin', 'Anjum', 'Afroz', 'Nur', 'Mahmud', 'Uddin', 'Kabir']
const HINDU_FIRST = ['Puja', 'Moumita', 'Sraboni', 'Tithi', 'Mitu', 'Rima', 'Ananya', 'Kakoli', 'Ruma', 'Bristy', 'Mou', 'Orpita', 'Shreya', 'Ritu', 'Shanta', 'Moushumi', 'Debjani', 'Susmita', 'Tanusree', 'Nandita']
const HINDU_LAST = ['Saha', 'Das', 'Roy', 'Sarkar', 'Majumder', 'Biswas', 'Chakraborty', 'Ghosh', 'Paul', 'Dutta', 'Dey', 'Barua', 'Pramanik', 'Rani', 'Bhowmik', 'Nandi', 'Mallick', 'Karmakar']

const STYLES = ['bridal and reception glam', 'soft glam and party looks', 'natural everyday makeup', 'holud, mehndi and engagement looks', 'HD and airbrush bridal makeup', 'editorial and photoshoot makeup', 'Muslim bridal and nikah looks', 'minimal dewy-skin makeup']
const OPENERS = ['I believe great makeup should feel like you, only brighter.', 'Skin first, colour second — that is how I work.', 'Every client gets a consultation before a single brush touches their face.', 'I love turning big days into beautiful memories.', 'Long-wear, camera-ready and comfortable is my promise.', 'Warm tones, soft blends and a lot of smiles.']

// Bigger cities get more than one artist.
const EXTRA = { Dhaka: 4, Chattogram: 3, Sylhet: 1, Rajshahi: 1, Khulna: 1, Gazipur: 1, Narayanganj: 1, Cumilla: 1, Rangpur: 1, Barishal: 1, Mymensingh: 1, Bogura: 1 }

const PACKAGES = {
  LOW: [['Everyday Natural', 'A fresh, light look for college, office or a casual outing.', 1500, 1, 'Skin tint, brows, lip tint'], ['Party Glam', 'Defined eyes and a pretty lip for dinners and small events.', 2800, 2, 'Base, eyes, lashes, lips']],
  MEDIUM: [['Bridal Trial', 'Try your look before the big day.', 2500, 2, 'Consultation, full face trial'], ['Soft Glam', 'Polished, camera-friendly makeup for events.', 6000, 2, 'Full base, eyes, lashes, contour'], ['Holud / Engagement Look', 'Colourful, long-wear makeup for pre-wedding functions.', 8500, 3, 'HD base, lashes, hair set']],
  HIGH: [['Bridal Trial', 'A full trial with the exact products for your wedding day.', 5000, 2, 'Consultation, full face trial'], ['Reception Glam', 'Statement makeup for receptions and photoshoots.', 14000, 3, 'HD base, lashes, glitter accents'], ['Full Bridal HD', 'Long-wear, HD-ready bridal makeup with premium products.', 18000, 4, 'HD base, lashes, hair styling, touch-up kit']],
}
const TIER_YEARS = { LOW: [1, 4], MEDIUM: [3, 8], HIGH: [6, 15] }

function buildArtists(districts) {
  const list = []
  const used = new Set()
  const slots = []
  for (const d of districts) for (let i = 0; i < 1 + (EXTRA[d] || 0); i++) slots.push(d)
  slots.forEach((district, i) => {
    let first, last, key
    do {
      const hindu = rand() < 0.2
      first = pick(hindu ? HINDU_FIRST : MUSLIM_FIRST)
      last = pick(hindu ? HINDU_LAST : MUSLIM_LAST)
      key = `${first} ${last}`
    } while (used.has(key))
    used.add(key)
    const metro = ['Dhaka', 'Chattogram', 'Gazipur', 'Narayanganj'].includes(district)
    const r = rand()
    const tier = metro ? (r < 0.15 ? 'LOW' : r < 0.55 ? 'MEDIUM' : 'HIGH') : (r < 0.4 ? 'LOW' : r < 0.85 ? 'MEDIUM' : 'HIGH')
    const [ymin, ymax] = TIER_YEARS[tier]
    const style = pick(STYLES)
    const style2 = pick(STYLES.filter((s) => s !== style))
    list.push({
      n: i + 1, hindu: HINDU_LAST.includes(last), name: key, email: `demo.${first}.${last}@${DOMAIN}`.toLowerCase(), district, tier,
      years: between(ymin, ymax),
      bio: `${pick(OPENERS)} I specialise in ${style} and also love ${style2}. Based in ${district}, available for home visits and events nearby.`,
      age: pick(['19-25', '26-35', '26-35', '26-35', '36-50']),
      pkgs: PACKAGES[tier].map(([t, d, p, h, inc]) => ({ title: t, description: d, price: Math.round((p * (0.9 + rand() * 0.25)) / 100) * 100, durationHours: h, includes: inc })),
    })
  })
  return list
}

// ---------- http helpers ----------
async function call(method, url, { token, json, form } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers['Content-Type'] = 'application/json'
  const res = await fetch(API + url, { method, headers, body: json ? JSON.stringify(json) : form })
  const text = await res.text()
  let data = null
  try { data = JSON.parse(text) } catch { /* not json */ }
  return { ok: res.ok, status: res.status, data }
}

async function fetchDistricts() {
  const r = await call('GET', '/artists/districts')
  if (!r.ok) throw new Error('Backend not reachable at ' + API)
  return Object.values(r.data).flat()
}

// ---------- portraits ----------
// Real placeholder portraits from randomuser.me (a free service made for demo/placeholder avatars; 128px).
// Photos that look South Asian come first so the biggest cities get them; unsuitable ones (children, dyed hair...) are skipped.
const FIRST = [8, 22, 88, 15, 13, 1, 4, 18, 12, 19]
const SKIP = new Set([0, 3, 5, 7, 9, 16, 20, 31, 32, 35, 37, 64, 65, 68, 72, 77, 96, 97])
const PHOTO_IDS = [...FIRST, ...Array.from({ length: 99 }, (_, i) => i).filter((i) => !SKIP.has(i) && !FIRST.includes(i))]

async function cmdFaces(artists, only) {
  fs.mkdirSync(FACES, { recursive: true })
  const todo = artists.filter((a) => !only || only.includes(a.n))
  for (const a of todo) {
    const id = PHOTO_IDS[(a.n - 1) % PHOTO_IDS.length]
    const res = await fetch(`https://randomuser.me/api/portraits/women/${id}.jpg`)
    if (!res.ok) { console.log(`FAIL #${a.n} (photo ${id}): ${res.status}`); continue }
    fs.writeFileSync(path.join(FACES, String(a.n).padStart(2, '0') + '.jpg'), Buffer.from(await res.arrayBuffer()))
  }
  console.log(`downloaded ${todo.length} portraits into ${FACES}`)
}
// ---------- seeding ----------
async function adminToken() {
  const r = await call('POST', '/auth/admin-login', { json: ADMIN })
  if (!r.ok) throw new Error('Admin login failed: ' + r.data?.message)
  return r.data.token
}

async function cmdSeed(artists) {
  const admin = await adminToken()
  let created = 0, skipped = 0
  const futureDates = (k) => Array.from({ length: k }, () => { const d = new Date(); d.setDate(d.getDate() + between(3, 40)); return d.toISOString().slice(0, 10) })
  for (const a of artists) {
    const reg = await call('POST', '/auth/register', { json: { name: a.name, email: a.email, password: PASSWORD, district: a.district, budgetTier: a.tier } })
    if (reg.status === 409) { skipped++; console.log(`skip #${a.n} ${a.name} (exists)`); continue }
    if (!reg.ok) { console.log(`FAIL #${a.n} ${a.name}: ${reg.data?.message}`); continue }
    const token = reg.data.token
    await call('PUT', '/artists/me', { token, json: { name: a.name, bio: a.bio, baseLocation: a.district, yearsExperience: a.years, budgetTier: a.tier } })
    for (const p of a.pkgs) await call('POST', '/packages', { token, json: p })
    for (const d of futureDates(3)) await call('PUT', `/availability/${d}`, { token, json: { status: 'BLOCKED' } })
    const file = path.join(FACES, String(a.n).padStart(2, '0') + '.jpg')
    if (fs.existsSync(file)) {
      const fd = new FormData()
      fd.append('file', new Blob([fs.readFileSync(file)], { type: 'image/jpeg' }), 'profile.jpg')
      const up = await call('POST', '/account/me/photo', { token, form: fd })
      if (!up.ok) console.log(`  photo failed for #${a.n}: ${up.data?.message}`)
    }
    if (rand() < 0.65) await call('PUT', `/admin/users/${reg.data.userId}/verify`, { token: admin })
    created++
    console.log(`ok   #${a.n} ${a.name} - ${a.district} - ${a.tier}`)
  }
  console.log(`\ncreated ${created}, skipped ${skipped}. Demo password for every account: ${PASSWORD}`)
}

async function cmdClean() {
  const admin = await adminToken()
  const users = (await call('GET', '/admin/users?role=ARTIST', { token: admin })).data || []
  for (const u of users.filter((x) => x.email.endsWith('@' + DOMAIN))) {
    const r = await call('DELETE', `/admin/users/${u.id}`, { token: admin })
    console.log(`${r.ok ? 'removed' : 'FAIL'} ${u.name}`)
  }
}

const [cmd, arg] = process.argv.slice(2)
const districts = await fetchDistricts()
const artists = buildArtists(districts)
if (cmd === 'faces') await cmdFaces(artists, arg ? arg.split(',').map(Number) : null)
else if (cmd === 'sheet') artists.forEach((a) => console.log(`${a.n}\t${a.name}\t${a.district}\t${a.tier}`))
else if (cmd === 'seed') await cmdSeed(artists)
else if (cmd === 'clean') await cmdClean()
else console.log('usage: node seed.mjs faces|sheet|seed|clean')
