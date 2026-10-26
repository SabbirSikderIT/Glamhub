import { Link } from 'react-router-dom'

/** Tiny markdown renderer that builds React elements (never innerHTML). Supports **bold**, *italic*, `code`, lists, headings, and /artists/ID links. */
function inline(text, keyPrefix) {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\/artists\/\d+)/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${keyPrefix}-${i++}`
    if (t.startsWith('**')) out.push(<strong key={k}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k} className="rounded bg-border px-1">{t.slice(1, -1)}</code>)
    else if (t.startsWith('/artists/')) out.push(<Link key={k} to={t} className="font-bold text-accent underline">view profile</Link>)
    else out.push(<em key={k}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export default function ChatMarkdown({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let list = null
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/)
    if (bullet) {
      const ordered = /^\s*\d/.test(line)
      if (!list || list.ordered !== ordered) { list = { ordered, items: [] }; blocks.push(list) }
      list.items.push(bullet[1])
      return
    }
    list = null
    if (!line.trim()) return
    const h = line.match(/^#{1,4}\s+(.*)$/)
    blocks.push(h ? { heading: h[1] } : { p: line, idx })
  })
  return (
    <div className="space-y-2 break-words">
      {blocks.map((b, i) => {
        if (b.items) {
          const Tag = b.ordered ? 'ol' : 'ul'
          return <Tag key={i} className={`${b.ordered ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>{b.items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</Tag>
        }
        if (b.heading) return <p key={i} className="font-display text-lg font-bold">{inline(b.heading, `h${i}`)}</p>
        return <p key={i}>{inline(b.p, `p${i}`)}</p>
      })}
    </div>
  )
}
