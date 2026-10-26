import { useEffect, useRef, useState } from 'react'
import ChatMarkdown from '../components/ChatMarkdown.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { errorMessage, sendAiMessage, transcribeAudio } from '../services/api.js'

const LABEL = { idle: 'Tap the mic and talk', recording: 'Listening… tap to stop', transcribing: 'Understanding what you said…', thinking: 'Thinking of a reply…', speaking: 'Speaking…' }

/** Voice chat: MediaRecorder -> server transcription (Whisper) -> chat -> browser speechSynthesis. */
export default function Speak() {
  const { user } = useAuth()
  const [status, setStatus] = useState('idle')
  const [turns, setTurns] = useState([])
  const [error, setError] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const recorder = useRef(null)
  const stream = useRef(null)
  const chunks = useRef([])

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
    stream.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const speak = (text) => {
    if (!window.speechSynthesis) { setStatus('idle'); return }
    const plain = text.replace(/[*_`#]/g, '').replace(/\/artists\/\d+/g, 'the profile link')
    const u = new SpeechSynthesisUtterance(plain)
    u.rate = 1
    u.onend = () => setStatus('idle')
    u.onerror = () => setStatus('idle')
    setStatus('speaking')
    window.speechSynthesis.speak(u)
  }

  const start = async () => {
    setError('')
    window.speechSynthesis?.cancel()
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Your browser doesn\'t support voice recording. Try Chrome, Edge or Safari, or use the text chat.')
      return
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('We need microphone permission to hear you. Please allow it and try again.')
      return
    }
    chunks.current = []
    const rec = new MediaRecorder(stream.current)
    recorder.current = rec
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data)
    rec.onstop = handleStop
    rec.start()
    setStatus('recording')
  }

  const stop = () => recorder.current?.state === 'recording' && recorder.current.stop()

  async function handleStop() {
    stream.current?.getTracks().forEach((t) => t.stop()) // release the microphone
    const mime = recorder.current?.mimeType || 'audio/webm'
    const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm' // Whisper picks its decoder from the extension
    const blob = new Blob(chunks.current, { type: mime })
    if (blob.size < 1000) { setStatus('idle'); setError('We didn\'t catch anything. Please try again.'); return }
    try {
      setStatus('transcribing')
      const { text } = await transcribeAudio(blob, `recording.${ext}`)
      setTurns((t) => [...t, { role: 'user', content: text }])
      setStatus('thinking')
      const history = turns.map((t) => ({ role: t.role, content: t.content }))
      const res = await sendAiMessage({ conversationId, message: text, history: user ? undefined : history, mode: 'voice' })
      if (user && res.conversationId) setConversationId(res.conversationId)
      setTurns((t) => [...t, { role: 'assistant', content: res.reply }])
      speak(res.reply)
    } catch (e) {
      setError(errorMessage(e)); setStatus('idle')
    }
  }

  const busy = status === 'transcribing' || status === 'thinking'
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-center">
      <h1 className="text-4xl font-bold">Speak with <span className="text-brand">GlamHub AI</span></h1>
      <p className="mt-2 text-ink-muted">Ask about makeup looks, colours or booking out loud — I'll answer out loud too.</p>

      <div className="my-10 flex flex-col items-center gap-4">
        <button type="button" disabled={busy} onClick={status === 'recording' ? stop : start}
          className={`relative flex h-28 w-28 items-center justify-center rounded-full text-5xl text-white shadow-hover transition-transform hover:scale-105 disabled:opacity-60 ${status === 'recording' ? 'bg-[#d6455d]' : 'bg-brand'}`}
          aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}>
          {status === 'recording' && <span className="absolute inset-0 animate-ping rounded-full bg-[#d6455d] opacity-40" />}
          <span className="relative">{status === 'recording' ? '⏹' : '🎙'}</span>
        </button>
        <p className="font-bold text-ink-muted" role="status">{LABEL[status]}</p>
        {status === 'speaking' && <button type="button" className="pill" onClick={() => { window.speechSynthesis.cancel(); setStatus('idle') }}>Stop speaking</button>}
        {error && <p className="rounded-2xl bg-[#fde3e8] px-4 py-2 text-sm text-[#9c2340]" role="alert">{error}</p>}
      </div>

      <div className="space-y-3 text-left">
        {turns.map((t, i) => (
          <div key={i} className={`card p-4 text-sm ${t.role === 'user' ? 'ml-10 !bg-surface-raised' : 'mr-10'}`}>
            <p className="mb-1 text-xs font-bold uppercase text-accent">{t.role === 'user' ? 'You said' : 'GlamHub AI'}</p>
            {t.role === 'user' ? t.content : <ChatMarkdown text={t.content} />}
          </div>
        ))}
      </div>
    </div>
  )
}
