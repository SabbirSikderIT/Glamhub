import { useEffect, useRef, useState } from 'react'
import { Avatar } from './ArtistCard.jsx'
import { Notice } from './Widgets.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { cancelDeletionRequest, errorMessage, getDeletionRequest, requestDeletion, uploadAccountPhoto } from '../services/api.js'

export function ProfilePhotoUploader() {
  const { user, patch } = useAuth()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError('')
    try { const acc = await uploadAccountPhoto(file); patch({ profilePhotoUrl: acc.profilePhotoUrl }) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false); e.target.value = '' }
  }
  return (
    <div className="flex items-center gap-4">
      <Avatar name={user.name} url={user.profilePhotoUrl} size="h-20 w-20 text-2xl" />
      <div>
        <button type="button" className="pill" disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : 'Change photo'}</button>
        <input ref={input} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onFile} />
        <p className="mt-1 text-xs text-ink-muted">JPG or PNG, up to 15 MB.</p>
        {error && <p className="text-sm text-[#9c2340]" role="alert">{error}</p>}
      </div>
    </div>
  )
}

/** Shared by customers and artists. */
export function DeleteAccountSection() {
  const [req, setReq] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getDeletionRequest().then(setReq).catch((e) => setError(errorMessage(e))) }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!window.confirm('Request deletion of your account? A moderator will review it.')) return
    setBusy(true); setError('')
    try { setReq(await requestDeletion(reason)) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  const cancel = async () => {
    setBusy(true)
    try { await cancelDeletionRequest(); setReq({ status: 'NONE' }); setReason('') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  if (!req) return error ? <Notice kind="error">{error}</Notice> : null
  return (
    <div className="card space-y-3 p-6">
      <h2 className="text-2xl font-bold">Delete my account</h2>
      <p className="text-sm text-ink-muted">Deleting your account removes your profile and data permanently. A GlamHub moderator reviews each request.</p>
      {error && <Notice kind="error">{error}</Notice>}
      {req.status === 'PENDING' && (
        <>
          <Notice kind="info">Your request is waiting for review. Nothing has been deleted yet.</Notice>
          <button type="button" className="pill" disabled={busy} onClick={cancel}>Cancel my request</button>
        </>
      )}
      {(req.status === 'NONE' || req.status === 'REJECTED') && (
        <form onSubmit={submit} className="space-y-3">
          {req.status === 'REJECTED' && <Notice kind="error">Your earlier request was declined{req.adminNote ? `: ${req.adminNote}` : '.'} You can submit a new one.</Notice>}
          <textarea className="field" rows={3} maxLength={1000} placeholder="Why are you leaving? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button className="pill pill-danger" disabled={busy}>Request account deletion</button>
        </form>
      )}
    </div>
  )
}
