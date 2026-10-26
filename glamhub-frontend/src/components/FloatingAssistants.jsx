import { useEffect, useRef, useState } from 'react'
import ChatMarkdown from './ChatMarkdown.jsx'
import { AiSparkIcon } from './Icons.jsx'
import { askWidget, errorMessage } from '../services/api.js'

/** Quick-help chat bubble (Gemini) and a hands-free voice agent (browser speech recognition). Opened by window events. */
export default function FloatingAssistants() {
  const [chatOpen, setChatOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)

  useEffect(() => {
    const c = () => { setVoiceOpen(false); setChatOpen(true) }
    const v = () => { setChatOpen(false); setVoiceOpen(true) }
    window.addEventListener('open-chat-widget', c)
    window.addEventListener('open-voice-agent', v)
    return () => { window.removeEventListener('open-chat-widget', c); window.removeEventListener('open-voice-agent', v) }
  }, [])

  return (
    <>
      {!chatOpen && !voiceOpen && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
          <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-lavender text-xl text-white shadow-hover transition-transform hover:scale-110" onClick={() => setVoiceOpen(true)} aria-label="Open voice assistant">🎙</button>
          <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full bg-brand shadow-hover transition-transform hover:scale-110" onClick={() => setChatOpen(true)} aria-label="Open chat assistant"><AiSparkIcon className="h-7 w-7" /></button>
        </div>
      )}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      {voiceOpen && <VoicePanel onClose={() => setVoiceOpen(false)} />}
    </>
  )
}

function Panel({ title, onClose, children }) {
  return (
    <section className="card fixed bottom-4 right-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden shadow-hover" aria-label={title}>
      <header className="flex items-center justify-between bg-brand px-4 py-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-xl">✕</button>
      </header>
      {children}
    </section>
  )
}

function ChatPanel({ onClose }) {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi gorgeous! 💖 Ask me anything about makeup looks, budgets or booking.' }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const send = async (e) => {
    e.preventDefault()
    const msg = text.trim()
    if (!msg || busy) return
    setText(''); setBusy(true)
    const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }))
    setMessages((m) => [...m, { role: 'user', content: msg }])
    try {
      const res = await askWidget(msg, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: errorMessage(err, "I couldn't answer that just now.") }])
    } finally { setBusy(false) }
  }

  return (
    <Panel title="GlamHub helper" onClose={onClose}>
      <div className="flex-1 space-y-2 overflow-auto p-3" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-brand' : 'bg-surface-raised'}`}>{m.role === 'user' ? m.content : <ChatMarkdown text={m.content} />}</div>
          </div>
        ))}
        {busy && <p className="text-xs text-ink-muted">Typing…</p>}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
        <input className="field !py-2" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question…" aria-label="Message" maxLength={1500} />
        <button className="pill pill-primary !px-4" disabled={busy || !text.trim()}>Send</button>
      </form>
    </Panel>
  )
}

function VoicePanel({ onClose }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  const [state, setState] = useState('idle')
  const [heard, setHeard] = useState('')
  const [reply, setReply] = useState('')
  const [error, setError] = useState('')
  const rec = useRef(null)

  useEffect(() => () => { rec.current?.abort?.(); window.speechSynthesis?.cancel() }, [])

  const listen = () => {
    setError(''); setReply(''); setHeard('')
    window.speechSynthesis?.cancel()
    const r = new SR()
    rec.current = r
    r.lang = 'en-US'
    r.interimResults = false
    r.onresult = async (e) => {
      const text = e.results[0][0].transcript
      setHeard(text); setState('thinking')
      try {
        const res = await askWidget(text, [])
        setReply(res.reply); setState('speaking')
        const u = new SpeechSynthesisUtterance(res.reply.replace(/[*_`#]/g, '').replace(/\/artists\/\d+/g, 'the profile link'))
        u.onend = () => setState('idle')
        window.speechSynthesis.speak(u)
      } catch (err) { setError(errorMessage(err)); setState('idle') }
    }
    r.onerror = () => { setError('I couldn\'t hear you. Please check your microphone permission and try again.'); setState('idle') }
    r.onend = () => setState((s) => (s === 'listening' ? 'idle' : s))
    r.start()
    setState('listening')
  }

  return (
    <Panel title="Voice assistant" onClose={onClose}>
      <div className="flex flex-1 flex-col items-center gap-3 overflow-auto p-5 text-center">
        {!SR ? <p className="text-sm text-ink-muted">Your browser doesn't support voice recognition. Try Chrome or Edge, or use the full-page <a href="/speak" className="font-bold text-accent">Speak with AI</a>.</p> : (
          <>
            <button type="button" onClick={listen} disabled={state !== 'idle'} className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-3xl shadow-hover disabled:opacity-60" aria-label="Start listening">🎙</button>
            <p className="text-sm font-bold text-ink-muted" role="status">{{ idle: 'Tap and ask me something', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking…' }[state]}</p>
            {heard && <p className="text-sm"><strong>You:</strong> {heard}</p>}
            {reply && <div className="w-full rounded-2xl bg-surface-raised p-3 text-left text-sm"><ChatMarkdown text={reply} /></div>}
            {error && <p className="text-sm text-[#9c2340]" role="alert">{error}</p>}
          </>
        )}
      </div>
    </Panel>
  )
}
