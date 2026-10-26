import fs from 'node:fs'
const c = JSON.parse(fs.readFileSync('candidates.json', 'utf8'))
const score = (x) => x.likes * 3 + x.downloads / 200 + (/(indian|asian|bengal|bangla|south)/i.test(x.tags) ? 400 : 0)
const out = []
for (const cat of ['BRIDAL', 'CASUAL', 'PARTY', 'EDITORIAL']) out.push(...c.filter((x) => x.cat === cat).sort((a, b) => score(b) - score(a)).slice(0, 110))
fs.mkdirSync('cand', { recursive: true })
let done = 0
const q = [...out]
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const x = q.shift(); const f = `cand/${x.id}.jpg`; if (!fs.existsSync(f)) { const r = await fetch(x.thumb); if (r.ok) fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())) } done++ } }))
fs.writeFileSync('shortlist.json', JSON.stringify(out, null, 1))
console.log('downloaded', done, 'thumbnails;', out.length, 'in shortlist')
