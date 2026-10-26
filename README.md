# GlamHub - find and book makeup artists in Bangladesh

    GlamHub/
      glamhub-frontend/   React 19 + Vite + Tailwind 4 single-page app   (npm install && npm run dev -> :5180)
      glamhub-backend/    Spring Boot 3.5 / Java 17+ REST API            (mvn spring-boot:run or java -jar -> :8080)
      glamhub-database/   docker-compose.yml (Postgres on :5440) + schema snapshot

## Run it
1. `cd glamhub-database && docker compose up -d`
2. `cd glamhub-backend && mvn -DskipTests package && java -jar target/glamhub-backend-1.0.0.jar`
   (the AI model `models/detectra-v3/model.onnx` must be present; see below)
3. `cd glamhub-frontend && npm install && npm run dev` then open http://localhost:5180

Staff login: http://localhost:5180/admin/login - `admin@glamhub.com` / `Admin@12345` (seeded main admin; change `MAIN_ADMIN_PASSWORD`
before first run in any shared environment).

## Secrets
`glamhub-backend/local.properties` (git-ignored) holds API keys; copy `local.properties.example` and fill it in. It deliberately uses real
Spring property keys so it wins over same-named OS environment variables. Set `spring.mail.username` to the Gmail address that owns
the app password to enable emails (otherwise OTP codes are shown on screen instead).

## Features
Home with animated artist + looks + process sections; search by name/district/budget (low/medium/high)/look; artist profiles with
portfolio, packages, availability, reviews; guest booking with 4 verification methods (SMS OTP, email OTP, QR, Google Authenticator);
SSLCommerz deposit (admin-set percentage); blue badge; artist dashboard; full admin panel; account deletion requests; AI chat (Groq),
voice chat (Whisper), floating helper (Gemini); portfolio uploads screened by Detectra v3 (local ONNX) + duplicate detection + optional
AI-or-Not deep check; Suggestions (colour palettes, light/medium/heavy looks); FAQ.

## Detectra model
`glamhub-backend/models/detectra-v3/model.onnx` is `TensorFold/detectra-v1` on Hugging Face (README calls it "Detectra v3"), sha256 1414b9aa...962b.

## Team credits
Edit `glamhub-frontend/src/data/team.js`.
