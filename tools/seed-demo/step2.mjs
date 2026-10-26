import fs from 'node:fs'
const L = JSON.parse(fs.readFileSync('shortlist.json', 'utf8'))
const picks = {
  BRIDAL: [6,7,18,11,29,21, 43,69,70,79,75, 86,105,98,101],
  CASUAL: [5,9,12,38, 41,63,74,53, 110,112,117,85, 128,129,139,141,150,148,146, 166,175,178,183,174,177,197,173, 205,209,213,220,214, 265],
  PARTY: [13,16,40,31, 57,60, 106,119,114, 124,149,127,152, 161,167,179,186,200, 201,204,207,211,218, 257],
  EDITORIAL: [2,8,15,20,25,35,37, 51,54,59,67,73, 82,116, 126,137,158,157,125,140, 192,184,196,162],
}
const acc = []
for (const [cat, idx] of Object.entries(picks)) for (const i of idx) { const x = L[i - 1]; acc.push({ ...x, cat }) }
fs.writeFileSync('accepted.json', JSON.stringify(acc, null, 1))
const by = {}; for (const a of acc) by[a.cat] = (by[a.cat] || 0) + 1; console.log('accepted', acc.length, by)

// fresh batch from the tightened candidate list
const c2 = JSON.parse(fs.readFileSync('candidates2.json', 'utf8'))
const taken = new Set([...L.map((x) => x.id)])
const score = (x) => x.likes * 3 + x.downloads / 200 + (/(indian|asian|bengal|bangla|south)/i.test(x.tags) ? 400 : 0)
const batch = []
for (const cat of ['BRIDAL', 'CASUAL', 'PARTY', 'EDITORIAL']) batch.push(...c2.filter((x) => x.cat === cat && !taken.has(x.id)).sort((a, b) => score(b) - score(a)).slice(0, 100))
let n = 0; const q = [...batch]
await Promise.all(Array.from({ length: 6 }, async () => { while (q.length) { const x = q.shift(); const f = `cand/${x.id}.jpg`; if (!fs.existsSync(f)) { const r = await fetch(x.thumb); if (r.ok) fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())) } n++ } }))
fs.writeFileSync('shortlist2.json', JSON.stringify(batch, null, 1)); console.log('new batch', batch.length)
