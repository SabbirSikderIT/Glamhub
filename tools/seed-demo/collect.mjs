// Collect candidate makeup portraits from Pixabay (free licence), per portfolio category. Thumbnails only; final picks are downloaded by `portfolio.mjs`.
import fs from 'node:fs'
const key = fs.readFileSync('.env', 'utf8').match(/PIXABAY_KEY=(.+)/)[1].trim()
const GROUPS = {
  BRIDAL: ['bridal makeup', 'bride makeup', 'wedding makeup woman', 'indian bride', 'bride portrait', 'bengali bride', 'south asian bride'],
  CASUAL: ['natural makeup woman', 'everyday makeup woman', 'fresh face makeup', 'beauty portrait woman smile', 'soft makeup girl', 'makeup woman portrait'],
  PARTY: ['party makeup woman', 'glamour makeup woman', 'red lipstick woman', 'glitter makeup woman', 'evening makeup woman', 'smoky eyes woman'],
  EDITORIAL: ['fashion makeup model', 'creative makeup woman', 'editorial makeup', 'avant garde makeup', 'colorful makeup woman', 'artistic makeup portrait'],
}
const NEED = /\b(woman|women|girl|female|lady|bride|model|face|portrait|beauty|lips|lipstick)\b/i
const BAD = /\b(man|men|boy|male|child|kid|baby|toddler|cosmetics|product|brush|brushes|palette|nail|nails|manicure|skincare|cream|bottle|set|kit|flat lay|doll|mannequin|statue|cartoon|drawing|illustration|3d|render|ai|generated|couple|wedding couple|groom|family|group|friends|dance|nude|lingerie|bikini|erotic|sexy|fetish)\b/i
const seen = new Map()
for (const [cat, queries] of Object.entries(GROUPS)) {
  for (const q of queries) {
    for (let page = 1; page <= 3; page++) {
      const r = await fetch(`https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&image_type=photo&per_page=200&page=${page}&safesearch=true&orientation=vertical&min_width=600`)
      if (!r.ok) { console.log('stop', r.status, await r.text().then(t => t.slice(0, 80))); break }
      const d = await r.json()
      for (const h of d.hits) {
        if (seen.has(h.id)) continue
        if (!NEED.test(h.tags) || BAD.test(h.tags)) continue
        seen.set(h.id, { id: h.id, cat, q, tags: h.tags, user: h.user, page: h.pageURL, thumb: h.webformatURL, large: h.largeImageURL, w: h.imageWidth, h: h.imageHeight, likes: h.likes, downloads: h.downloads })
      }
      if (d.hits.length < 200) break
      await new Promise((res) => setTimeout(res, 700))
    }
    console.log(cat.padEnd(10), q.padEnd(30), 'pool', seen.size)
  }
}
fs.writeFileSync('candidates.json', JSON.stringify([...seen.values()], null, 1))
const by = {}; for (const c of seen.values()) by[c.cat] = (by[c.cat] || 0) + 1
console.log(by)
