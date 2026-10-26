<div align="center">

# 💄 GlamHub

**Find, book and love your makeup artist across Bangladesh.**

A full-stack marketplace where clients discover verified makeup artists by district and budget, book them with multi-method verification, and pay a deposit online — while artists run their business and admins keep the platform trustworthy.

![Java](https://img.shields.io/badge/Java-17+-ED8B00?logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Tests](https://img.shields.io/badge/backend_tests-31_passing-brightgreen)

</div>

---

## Table of contents
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [How the key flows work](#how-the-key-flows-work)
- [Security notes](#security-notes)
- [Testing](#testing)
- [API overview](#api-overview)
- [Roadmap & known limitations](#roadmap--known-limitations)
- [Credits](#credits)

## Features

### For clients (no account needed to book)
- **Search** artists by name, **district** (all 64 districts of Bangladesh), **budget tier** (low / medium / high) and **look type** (bridal, casual, party, editorial), with infinite scrolling.
- **Artist profiles** with a verified portfolio, packages, live availability calendar and reviews.
- **Guest booking** with four verification methods: **SMS OTP**, **email OTP**, **QR code** (the artist shows it, the client scans it) and **Google Authenticator (TOTP)**.
- **Online deposit** through **SSLCommerz** (cards, bKash, Nagad, Rocket, internet banking). The deposit percentage is set by the admin.
- **Ratings & reviews** after a completed session.
- **Suggestions**: colour-palette guides and light / medium / heavy makeup sample guides.
- **AI assistants**: text chat, voice chat (speech-to-text + spoken replies) and a floating quick-help widget.
- Optional client account with booking history and self-service account deletion.

### For makeup artists
- Dashboard with monthly booking and earnings charts.
- **Portfolio manager** — every upload is screened automatically (see [AI screening](#ai-screening-of-portfolio-uploads)).
- Package manager, availability calendar, booking requests (confirm / decline / complete), QR verification, feedback replies, profile settings.
- Optional paid **verified blue badge** that ranks the artist first in search.

### For admins & moderators
- Overview analytics, review moderation, photo moderation (approve / reject / AI deep check), user management (verify, delete, ban), colour-palette and makeup-look management, account-deletion request queue.
- **Main admin only:** manage admins and moderators, blue-badge price and holders, and the **booking deposit percentage**.

### Experience
- Girly, rose-and-lavender design system with a hand-designed **dark mode**, animated hero scene, looks gallery, "behind the brush" process animation, and a credits section.
- Responsive from phone to wide desktop; respects `prefers-reduced-motion`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS 4, React Router 7, Axios |
| Backend | Java 17+, Spring Boot 3.5 (Web, Data JPA, Security, Validation, Mail), Lombok |
| Database | PostgreSQL 16 (Docker Compose), Hibernate `ddl-auto: update` |
| Auth | Stateless JWT (jjwt 0.12), role-based access, BCrypt |
| Payments | SSLCommerz (sandbox by default) |
| AI | Detectra v3 (local ONNX Runtime), Groq (chat + Whisper), Google Gemini (widget), AI-or-Not (admin deep check) |
| Misc | ZXing (QR codes), googleauth (TOTP), metadata-extractor (EXIF) |

## Project structure

```
GlamHub/
├── glamhub-frontend/     React single-page app (Vite)            → http://localhost:5180
├── glamhub-backend/      Spring Boot REST API                    → http://localhost:8080
│   └── models/detectra-v3/   local AI-image detector (ONNX)
└── glamhub-database/     docker-compose.yml + schema snapshot    → localhost:5440
```

Backend layering: `controller → service → repository → PostgreSQL`, DTOs at every API boundary, one global exception handler returning `{timestamp, status, message}`.

## Getting started

### Prerequisites
- **Java 17+** and **Maven** (or use your IDE)
- **Node.js 20+** and npm
- **Docker Desktop** (for PostgreSQL)

### 1. Clone and add the AI model
The Detectra model is too large for git, so download it once (MIT licence, ~43 MB):

```bash
# from the repository root
curl -L -o glamhub-backend/models/detectra-v3/model.onnx \
  https://huggingface.co/TensorFold/detectra-v1/resolve/main/model.onnx
# sha256 should be 1414b9aafaa01a644ed706224973f09b53a1388282104409862df9893b1b962b
```
> The app still runs without it: uploads are then held for manual review instead of being auto-published.

### 2. Create your local secrets file
```bash
cd glamhub-backend
cp local.properties.example local.properties   # then fill in your own keys (see Configuration)
```
`local.properties` is git-ignored. Every integration is optional — a missing key just disables that feature.

### 3. Start the database
```bash
cd glamhub-database
docker compose up -d
```

### 4. Start the backend
```bash
cd glamhub-backend
mvn -DskipTests package
java -jar target/glamhub-backend-1.0.0.jar
```
Wait for `Started GlamHubApplication` (about 30–45 s). Check: http://localhost:8080/api/palettes

### 5. Start the frontend
```bash
cd glamhub-frontend
npm install
npm run dev
```
Open **http://localhost:5180**.

### Main admin account
On first start the backend creates one main-admin account from the `MAIN_ADMIN_EMAIL` and `MAIN_ADMIN_PASSWORD` settings (see the Configuration table). **Set your own values before the first run**, then sign in at `/admin/login` on the frontend.

### Optional: demo data
`tools/seed-demo/` contains scripts that fill the site with demo makeup artists covering every district, plus sample portfolio photos, through the normal API. See `tools/seed-demo/README.md`. Demo data is for presentations only; do not use it in production.

## Configuration

Settings live in `glamhub-backend/src/main/resources/application.yml` and can be overridden with environment variables or `glamhub-backend/local.properties`.

| Setting (env var) | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | local Docker database on port 5440 (see `application.yml`) | Database connection — **use your own credentials outside local development** |
| `JWT_SECRET`, `JWT_EXPIRATION_MS` | development placeholder, 24 h | Token signing — **override in production** |
| `MAIN_ADMIN_EMAIL`, `MAIN_ADMIN_PASSWORD` | built-in development values | Seeded main admin account — **always override** |
| `APP_BASE_URL`, `APP_FRONTEND_URL` | `http://localhost:8080`, `http://localhost:5180` | URLs used in QR codes, upload links and payment redirects |
| `UPLOAD_DIR` | `uploads/portfolio` | Where photos are stored |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`, `SSLCOMMERZ_SANDBOX` | empty, empty, `true` | Payments |
| `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | empty | Password-reset and booking emails (Gmail app password) |
| `GROQ_API_KEY`, `GEMINI_API_KEY` | empty | AI chat, voice and widget |
| `AIORNOT_API_KEY` | empty | Admin "AI deep check" on a photo |
| `DETECTRA_MODEL_PATH`, `DETECTRA_REJECT_THRESHOLD` | `models/detectra-v3/model.onnx`, `0.50` | Local AI-image screening |
| `DUPLICATE_MAX_DISTANCE` | `6` | Perceptual-hash distance that counts as the same photo |
| Frontend `VITE_API_BASE_URL` | `http://localhost:8080/api` | API base URL |

> **Tip — testing on your phone (QR codes):** QR codes encode a URL your phone must reach. Set `APP_FRONTEND_URL` / `APP_BASE_URL` and `VITE_API_BASE_URL` to your computer's LAN IP instead of `localhost`. Vite already listens on all interfaces and the API allows private-LAN origins.

## How the key flows work

### Booking
1. **Details** — package, date, optional time slot, contact info. The date is reserved immediately.
2. **Verify** — one of four methods (switchable until verified).
3. **Deposit** — redirect to SSLCommerz. Amount = `package price × deposit % ÷ 100`, snapshotted on the booking so later rate changes never affect existing bookings.
4. **Confirmed** — the artist confirms (requires verification **and** a paid deposit), later marks it completed, and the client can rate it.

Status machine: `PENDING → CONFIRMED | CANCELLED`, `CONFIRMED → COMPLETED | CANCELLED`. Cancelling frees the date.

### Payments (reserve → redirect → server-confirm)
The browser redirect from the gateway is treated only as a hint. The backend re-validates every payment **server-to-server** with SSLCommerz and checks that the status is valid, the transaction id matches and the amount matches before marking anything paid. Forged callbacks are rejected.

### AI screening of portfolio uploads
Every artist upload goes through, in order: file-signature check → EXIF read → **Detectra v3** on-device AI-image detection (photos at or above the reject threshold are held back with a plain-language reason) → **duplicate detection** (SHA-256 for exact copies, a DCT perceptual hash for resized/re-encoded copies) → published. If the model is unavailable, the photo waits for manual review — an unscreened upload is never auto-published. Admins can approve, reject, or run an AI-or-Not deep check at any time.

## Security notes
- Passwords are **BCrypt-hashed only** — no plaintext copies anywhere.
- Per-endpoint role rules in `SecurityConfig`, plus a service-level **main-admin guard** for the most sensitive actions.
- Guest bookings are protected by an unguessable **access key**; reviews require it too.
- Uploads are validated by real file signature (JPG/PNG), not just the declared content type.
- OTP codes are only shown on screen when SMS/email delivery actually fails.
- Never commit `local.properties`; it holds your API keys. Rotate any key that has ever been shared in plain text.

## Testing

```bash
cd glamhub-backend
mvn test
```
31 automated tests cover the deposit maths and booking status machine, the payment confirmation rules (forged / mismatched / replayed callbacks), booking-money settings and access rules, duplicate-photo hashing, search filter handling, and a full Spring context smoke test.

The project was also verified end-to-end against a running stack: registration and login, access control (anonymous / wrong role / non-main admin), validation boundaries, all four verification methods, SSLCommerz sandbox initiation, cascade account deletion, and the UI in a real browser at desktop, tablet and phone widths.

## API overview

Base path `/api`. Highlights:

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/register-customer`, `/auth/login`, `/auth/admin-login`, password reset (`/auth/forgot-password`, `/verify-reset-otp`, `/reset-password`) |
| Discovery | `GET /artists/search`, `/artists/{id}`, `/artists/{id}/portfolio`, `/packages`, `/availability`, `GET /reviews?artistId=`, `/palettes`, `/looks`, `/showcase` |
| Booking | `POST /bookings`, `/bookings/{id}/verification-method`, `/confirm-otp`, `/deposit/initiate`, `/bookings/verify-qr/{token}`, `PUT /bookings/{id}/status` |
| Artist | `/packages`, `/portfolio`, `/availability/{date}`, `/reviews/mine`, `/blue-badge/*` |
| AI | `POST /ai-chat/messages`, `/ai-chat/transcribe`, `/chatbot/ask` |
| Admin | `/admin/overview`, `/reviews`, `/photos`, `/users`, `/deletion-requests`, `/palettes`, `/looks`; main-admin only: `/admin/staff`, `/blue-badge/*`, `/booking-money/settings` |

## Roadmap & known limitations
- Payments run against the SSLCommerz **sandbox**; live payments need real credentials and `SSLCOMMERZ_SANDBOX=false`.
- Free-tier SMS (Textbelt) cannot reach Bangladeshi numbers; use email OTP, QR or Authenticator, or plug in a local SMS provider.
- Only the **date** is locked per artist (one booking per day); time slots are informational.
- JPG and PNG uploads only (no HEIC/WebP).
- No frontend test suite or token refresh yet; the session simply expires after 24 h.
- Team names in the credits are placeholders — edit `glamhub-frontend/src/data/team.js`.

## Credits

Made with ❤️ by the **GlamHub team**.

Third-party models and services: [Detectra v3](https://huggingface.co/TensorFold/detectra-v1) (MIT), Groq, Google Gemini, AI-or-Not, SSLCommerz.

## License
No license file has been added yet. Add one (for example MIT) before making the repository public.
