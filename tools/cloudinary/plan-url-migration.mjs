// Lists every asset in the Cloudinary folder and matches it to the image URLs stored in the database.
import fs from 'node:fs'
import { execSync } from 'node:child_process'
const p = Object.fromEntries(fs.readFileSync('D:/uiu/GlamHub/glamhub-backend/local.properties','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]))
const cloud=p['app.cloudinary.cloud-name'], folder=p['app.cloudinary.folder'], auth='Basic '+Buffer.from(p['app.cloudinary.api-key']+':'+p['app.cloudinary.api-secret']).toString('base64')
const assets = new Map(); let cursor = ''
do {
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/resources/by_asset_folder?asset_folder=${folder}&max_results=500${cursor?`&next_cursor=${cursor}`:''}`,{headers:{Authorization:auth}})
  const d = await r.json(); for (const x of d.resources||[]) assets.set(x.public_id, x.secure_url); cursor = d.next_cursor
} while (cursor)
console.log('cloudinary assets in', folder+':', assets.size)
const q = (sql) => execSync(`docker exec glamhub-postgres psql -U postgres -d glamhub -At -c "${sql}"`).toString().trim().split('\n').filter(Boolean)
const rows = [['portfolio_images','image_url'],['users','profile_photo_url'],['makeup_looks','image_url']].flatMap(([t,c]) => q(`select '${t}','${c}',id,${c} from ${t} where ${c} is not null`).map(l=>l.split('|')))
let matched=0, missing=[], already=0
const sql=[]
for (const [t,c,id,url] of rows) {
  if (url.includes('res.cloudinary.com')) { already++; continue }
  const uuid = url.split('/').pop().replace(/\.[a-z]+$/i,'')
  const cu = assets.get(uuid)
  if (cu) { matched++; sql.push(`update ${t} set ${c}='${cu}' where id=${id};`) } else missing.push(`${t}#${id} ${url}`)
}
console.log('db image rows:', rows.length, '| matched', matched, '| already cloudinary', already, '| missing in cloudinary', missing.length)
console.log(missing.slice(0,5).join('\n'))
fs.writeFileSync('cloudinary-migrate.sql', 'begin;\n'+sql.join('\n')+'\ncommit;\n')
console.log('wrote cloudinary-migrate.sql with', sql.length, 'updates')
