import { useCallback, useEffect, useRef, useState } from 'react'
import ChatMarkdown from '../components/ChatMarkdown.jsx'
import { Spinner } from '../components/Icons.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { deleteConversation, errorMessage, getConversationMessages, getConversations, sendAiMessage } from '../services/api.js'

const SUGGESTIONS = ['Suggest a bridal look for a medium budget', 'What colours suit warm skin tones?', 'How should I prepare my skin before makeup?', 'How does booking on GlamHub work?']

export default function Chat() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [current, setCurrent] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef(null)

  const refresh = useCallback(() => { if (user) getConversations().then(setConversations).catch(() => {}) }, [user])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const open = async (id) => {
    setCurrent(id); setError('')
    try { setMessages(await getConversationMessages(id)) } catch (e) { setError(errorMessage(e)) }
  }
  const fresh = () => { setCurrent(null); setMessages([]); setError('') }

  const send = async (content) => {
    const msg = (content ?? text).trim()
    if (!msg || busy) return
    setText(''); setError(''); setBusy(true)
    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const res = await sendAiMessage({ conversationId: current, message: msg, history: user ? undefined : history, mode: 'text' })
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
      if (user && res.conversationId) { setCurrent(res.conversationId); refresh() }
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this conversation?')) return
    try { await deleteConversation(id); if (current === id) fresh(); setConversations((c) => c.filter((x) => x.id !== id)) } catch (e) { setError(errorMessage(e)) }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-8 md:grid-cols-[260px_1fr]">
      {user && (
        <aside className="card h-fit p-3 md:sticky md:top-24">
          <button type="button" className="pill pill-primary mb-2 w-full" onClick={fresh}>＋ New chat</button>
          <ul className="max-h-72 space-y-1 overflow-auto md:max-h-[60vh]">
            {conversations.map((c) => (
              <li key={c.id} className={`flex items-center gap-1 rounded-xl px-2 py-1 ${current === c.id ? 'bg-border' : ''}`}>
                <button type="button" className="flex-1 truncate text-left text-sm font-semibold" onClick={() => open(c.id)}>{c.title}</button>
                <button type="button" className="text-ink-muted hover:text-accent" onClick={() => remove(c.id)} aria-label={`Delete ${c.title}`}>🗑</button>
              </li>
            ))}
            {conversations.length === 0 && <li className="p-2 text-sm text-ink-muted">Your chats will appear here.</li>}
          </ul>
        </aside>
      )}
      <section className={`card flex h-[75vh] flex-col overflow-hidden ${user ? '' : 'md:col-span-2 mx-auto w-full max-w-3xl'}`}>
        <header className="border-b border-border px-5 py-3">
          <h1 className="text-xl font-bold">Chat with <span className="text-brand">GlamHub AI</span></h1>
          <p className="text-xs text-ink-muted">{user ? 'Your conversations are saved to your account.' : 'Log in to save your conversations.'}</p>
        </header>
        <div className="flex-1 space-y-3 overflow-auto p-5" aria-live="polite">
          {messages.length === 0 && (
            <div className="text-center">
              <div className="text-5xl">💬</div>
              <p className="mb-4 mt-2 text-ink-muted">Ask me about looks, colours, skincare, budgets or booking.</p>
              <div className="flex flex-wrap justify-center gap-2">{SUGGESTIONS.map((s) => <button key={s} type="button" className="pill !py-1.5 !text-sm" onClick={() => send(s)}>{s}</button>)}</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-brand rounded-br-md' : 'rounded-bl-md bg-surface-raised'}`}>
                {m.role === 'user' ? m.content : <ChatMarkdown text={m.content} />}
              </div>
            </div>
          ))}
          {busy && <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner className="h-4 w-4 text-accent" /> Thinking…</div>}
          {error && <p className="rounded-2xl bg-[#fde3e8] px-4 py-2 text-sm text-[#9c2340]" role="alert">{error}</p>}
          <div ref={endRef} />
        </div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); send() }}>
          <input className="field" placeholder="Type your question…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="Message" />
          <button className="pill pill-primary" disabled={busy || !text.trim()}>Send</button>
        </form>
      </section>
    </div>
  )
}
