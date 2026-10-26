-- GlamHub: lock down the database for Supabase.
-- Supabase automatically exposes every table in the "public" schema through its REST Data API to the public "anon" key.
-- GlamHub never uses that API (the Spring Boot backend connects directly as the postgres role), so we switch on
-- row-level security with NO policies, which denies the Data API completely, and remove the default grants.
-- The backend is unaffected because the postgres role bypasses row-level security.
-- Run this in the Supabase SQL Editor AFTER the tables exist (after schema.sql, or after the backend's first start).
-- It is safe to run again.

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
  END IF;
END $$;

-- check: every table should show rls_enabled = true
SELECT tablename, rowsecurity AS rls_enabled FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
