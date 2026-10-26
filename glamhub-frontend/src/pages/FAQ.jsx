import { useState } from 'react'
import { Link } from 'react-router-dom'

const FAQS = [
  ['Booking', [
    ['How do I book a makeup artist?', 'Search for an artist by name, district or budget, open their profile, pick a package and an available date, then verify your booking and pay a small deposit online. You do not need an account to book.'],
    ['Why do I need to verify my booking?', 'Verification proves the booking is really yours and protects artists from fake requests. You can verify by phone OTP, email OTP, a QR code your artist shows you, or Google Authenticator.'],
    ['How much is the deposit?', 'GlamHub sets a small deposit percentage (shown at checkout) on the package price. The rest is paid directly to your artist on the day. The percentage you were quoted when you booked never changes.'],
    ['Can I cancel or change my date?', 'Contact your artist as early as you can. Artists can cancel a booking, which frees the date again. Deposit refunds follow the artist\'s own policy, so please ask before you pay if you are unsure.'],
    ['How do I know my booking is confirmed?', 'Your booking shows "Pending" until your artist confirms it. They can confirm once you have verified and paid the deposit.'],
  ]],
  ['Makeup & budgets', [
    ['What do Low, Medium and High budget mean?', 'Each artist chooses a tier. Low is natural everyday work, roughly under ৳5,000. Medium is polished soft-glam, around ৳5,000–৳15,000. High is premium bridal and editorial artistry, above ৳15,000. Always check the artist\'s own packages for exact prices.'],
    ['What is the difference between light, medium and heavy makeup?', 'Light makeup evens your skin and enhances your features for a natural finish. Medium adds defined eyes, sculpting and a stronger lip for events. Heavy (full glam) uses full-coverage, long-wear products, dramatic eyes and lashes, ideal for brides and photography. See examples on our Suggestions page.'],
    ['Should I do a trial before my wedding?', 'Yes. A trial lets you and your artist test colours, coverage and how long the look lasts, so there are no surprises on the big day. Ask about trial packages when you book.'],
    ['How do I prepare my skin before makeup?', 'Cleanse and moisturise the night before and the morning of, drink plenty of water, and arrive with a clean, dry face and your hair already washed. Avoid trying new skincare products right before an event.'],
    ['I have sensitive skin or allergies. What should I do?', 'Tell your artist when booking. Many artists can use hypoallergenic products. If you have a known allergy, share it in advance and consider a patch test.'],
  ]],
  ['Payments', [
    ['Which payment methods are accepted?', 'Deposits are paid securely through SSLCommerz, which supports cards, bKash, Nagad, Rocket and internet banking.'],
    ['Is my payment safe?', 'Yes. You pay on SSLCommerz\'s own secure page and we confirm the payment directly with the gateway, so we never see your card details.'],
    ['My payment failed but money left my account', 'It is usually refunded by your bank automatically. If it is not, contact support with your booking number and we will help.'],
  ]],
  ['For makeup artists', [
    ['How do I join GlamHub?', 'Choose "Join as artist", pick your district and budget tier, then add your packages, portfolio photos and availability from your dashboard.'],
    ['Why was my portfolio photo rejected?', 'Every photo is checked by our AI. Photos that look AI-generated or that match an existing published photo are held back. If it is your genuine work, contact support and a moderator will review it.'],
    ['What is the blue verified badge?', 'An optional paid badge that shows clients you are a verified GlamHub artist and places you first in search results.'],
    ['How do I verify a client with a QR code?', 'Open the booking in your dashboard and show the QR code to the client. When they scan it with their phone the booking is verified instantly.'],
    ['Can I delete my account?', 'Yes. Request deletion from your dashboard and a moderator will review it. Your portfolio, packages and bookings are removed once it is approved.'],
  ]],
]

export default function FAQ() {
  const [open, setOpen] = useState('0-0')
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 sm:px-12">
      <h1 className="text-center text-4xl font-bold">Frequently asked <span className="text-brand">questions</span></h1>
      <p className="mb-8 mt-2 text-center text-ink-muted">Everything about booking, makeup looks, payments and being a GlamHub artist.</p>
      {FAQS.map(([group, items], g) => (
        <section key={group} className="mb-8" aria-labelledby={`g${g}`}>
          <h2 id={`g${g}`} className="mb-3 text-2xl font-bold">{group}</h2>
          <div className="space-y-2">
            {items.map(([q, a], i) => {
              const id = `${g}-${i}`
              const isOpen = open === id
              return (
                <div key={id} className="card overflow-hidden">
                  <button type="button" className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? '' : id)}>
                    {q}<span className={`text-accent transition-transform ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true">＋</span>
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-ink-muted">{a}</p>}
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="text-center text-ink-muted">Still stuck? <Link to="/chat" className="font-bold text-accent no-underline">Ask our AI assistant</Link>.</p>
    </div>
  )
}
