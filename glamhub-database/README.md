# GlamHub database

PostgreSQL 16. Locally it runs in Docker; in production it runs on **Supabase**.

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local development database (Docker, host port 5440) |
| `schema.sql` | Full schema for a fresh Supabase/Postgres database. Run once on an empty database |
| `supabase-security.sql` | Turns on row-level security and removes public API access. Run once after the tables exist |

## Local development
    docker compose up -d        # start (data lives in the named volume)
    docker compose down         # stop, keep data
    docker compose down -v      # stop and DELETE all data

Connection: `jdbc:postgresql://localhost:5440/glamhub`. See `application.yml` for the development credentials.
The backend creates and updates tables automatically (Hibernate `ddl-auto: update`), so `schema.sql` is only needed for Supabase.

## Deploying to Supabase (free plan)
1. Create a project at https://supabase.com and choose a strong database password. Keep it safe.
2. Open **SQL Editor**, paste the contents of `schema.sql`, and run it. Then paste and run `supabase-security.sql`.
   The final query should list all 20 tables with `rls_enabled = true`.
3. Get the connection details: **Project Settings > Database > Connection string > Session pooler**.
   Use the **Session pooler** (port 5432), not the "Direct connection" (it is IPv6-only and Render cannot reach it) and not the
   Transaction pooler on port 6543 (it does not support prepared statements, which Hibernate uses).
4. Give these to the backend (Render environment variables):

        DB_URL       = jdbc:postgresql://aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
        DB_USERNAME  = postgres.<your-project-ref>
        DB_PASSWORD  = <the database password from step 1>

   Note the username has the `postgres.<project-ref>` form and the URL starts with `jdbc:postgresql://`.
5. Start the backend. It connects, finds the tables and creates the main admin account from `MAIN_ADMIN_EMAIL` / `MAIN_ADMIN_PASSWORD`.

### Moving your existing local data (optional)
To bring over the demo artists and photos you already have locally (the photos live on Cloudinary, so the links keep working):

    docker exec glamhub-postgres pg_dump -U postgres -d glamhub --data-only --inserts --no-owner --exclude-table=image_url_backup > glamhub-data.sql
    psql "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" -f glamhub-data.sql

Run this **instead of** letting the app create data, right after `schema.sql`, and before the backend's first start. Never commit
`glamhub-data.sql`: it contains password hashes.
