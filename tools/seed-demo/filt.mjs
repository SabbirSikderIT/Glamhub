import fs from 'node:fs'
const c = JSON.parse(fs.readFileSync('candidates.json', 'utf8'))
const MAKEUP = /(make-?up|lipstick|bride|bridal|eye ?shadow|glamou?r|cosmetic|lips|eyeliner|mascara|face paint|body ?paint|henna|mehndi)/i
const PERSON = /\b(woman|women|girl|female|lady|bride|model|face|portrait|beauty)\b/i
const BAD2 = /\b(animal|cat|dog|tiger|lion|horse|bird|owl|eagle|leopard|christmas|santa|flat lay|handbag|bag|sunglasses|bottle|perfume|salon|barber|nail polish|tattoo|man|men)\b/i
const keep = c.filter((x) => MAKEUP.test(x.tags) && PERSON.test(x.tags) && !BAD2.test(x.tags))
const by = {}; for (const x of keep) by[x.cat] = (by[x.cat] || 0) + 1
console.log('kept', keep.length, by)
fs.writeFileSync('candidates2.json', JSON.stringify(keep, null, 1))
