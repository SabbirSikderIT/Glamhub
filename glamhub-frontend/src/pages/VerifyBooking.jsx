import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorBox, Loading } from '../components/Widgets.jsx'
import { errorMessage, verifyQrToken } from '../services/api.js'
import { prettyDate } from '../utils/format.js'

/** Opened by scanning the artist's QR code on the client's phone. */
export default function VerifyBooking() {
  const { token } = useParams()
  const [state, setState] = useState('loading')
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    verifyQrToken(token).then((b) => { setBooking(b); setState('ready') }).catch((e) => { setError(errorMessage(e)); setState('error') })
  }, [token])

  if (state === 'loading') return <Loading label="Verifying your booking…" />
  if (state === 'error') return <ErrorBox message={error} />
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="card p-8">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-2 text-3xl font-bold">Booking verified!</h1>
        <p className="mt-2 text-ink-muted">Your session with <strong>{booking.artistName}</strong> on {prettyDate(booking.bookingDate)} is verified. Go back to the booking page on your other device to pay the deposit and finish up.</p>
        <Link to="/" className="pill pill-primary mt-5">Back to GlamHub</Link>
      </div>
    </div>
  )
}
