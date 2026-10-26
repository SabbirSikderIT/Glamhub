import fs from 'node:fs'
const L2 = JSON.parse(fs.readFileSync('shortlist2.json', 'utf8'))
const acc = JSON.parse(fs.readFileSync('accepted.json', 'utf8'))
const picks = {
  BRIDAL: [1,3,4,6,10,11,12,16,20,21,22,24,28,31,35,36,39,40, 50,55,56,59,63,64,70,68,57,78, 81,83,86,90,96,98,82,97, 139, 219],
  CASUAL: [30,14,37, 42,41,47,43,51,46, 88,105,112,113,117,119, 127,129,133,143,153,156,160, 194,195,186],
  PARTY: [5,15,27, 45,54,69,76, 95,101,109,114,104,108,116,100, 124,137,146,135,142,132,122, 170,171,196, 225,236,233,234,205, 282,283,284,290,294,295,298,307,320],
  EDITORIAL: [60,62,67,77, 102,110, 121,128,131,154,155, 169,200,161,192,188, 217,221,226,235,237,210, 302,303,304,308,312,318],
}
const all = [...acc]
for (const [cat, idx] of Object.entries(picks)) for (const i of idx) all.push({ ...L2[i - 1], cat })
const seen = new Set(); const pool = []
for (const x of all) if (!seen.has(x.id)) { seen.add(x.id); pool.push(x) }
const by = {}; for (const p of pool) by[p.cat] = (by[p.cat] || 0) + 1
console.log('pool', pool.length, by)
fs.mkdirSync('portfolio', { recursive: true })
const key = fs.readFileSync('.env', 'utf8').match(/PIXABAY_KEY=(.+)/)[1].trim()
let ok = 0; const q = [...pool]
await Promise.all(Array.from({ length: 4 }, async () => { while (q.length) { const x = q.shift(); const f = `portfolio/${x.id}.jpg`; if (fs.existsSync(f)) { ok++; continue } const r = await fetch(x.large || x.thumb); if (r.ok) { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); ok++ } else console.log('fail', x.id, r.status) } }))
fs.writeFileSync('pool.json', JSON.stringify(pool, null, 1))
const credits = ['# Photo credits', '', 'Portfolio photos come from Pixabay (https://pixabay.com), used under the Pixabay Content License.', '', ...pool.map((p) => `- [${p.id}](${p.page}) by ${p.user} (${p.cat.toLowerCase()})`)]
fs.writeFileSync('CREDITS.md', credits.join('\n'))
console.log('downloaded', ok)
