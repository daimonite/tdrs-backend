-- =============================================================================
-- 000_ledger.sql — migration runner bootstrap (audit gap 29).
--
-- Apply ONCE manually in the Supabase SQL editor (the runner cannot create
-- its own RPC). After this file is applied, `node scripts/migrate.js`
-- handles every subsequent migration and records it in schema_migrations.
--
-- This file is idempotent.
-- =============================================================================

-- Thin RPC the runner uses to execute migration SQL with the service role.
-- Guard rail: UPDATE/DELETE without a WHERE clause are rejected (same rule as
-- the live project) so a malformed migration can never rewrite a whole table.
CREATE OR REPLACE FUNCTION public.exec_sql(query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF upper(btrim(query)) ~ '^(UPDATE|DELETE)' AND query !~* '\bWHERE\b' THEN
    RAISE EXCEPTION '% requires a WHERE clause', upper(split_part(btrim(query), ' ', 1));
  END IF;
  EXECUTE query;
  RETURN 'ok';
END;
$$;

-- Only the service role may run raw SQL through this helper.
REVOKE ALL ON FUNCTION public.exec_sql(TEXT) FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id           SERIAL PRIMARY KEY,
  filename     TEXT NOT NULL UNIQUE,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by   TEXT NOT NULL DEFAULT 'migrate.js',
  success      BOOLEAN NOT NULL DEFAULT TRUE,
  error_detail TEXT
);

-- Mark the bootstrap itself as applied so the runner skips it thereafter.
INSERT INTO public.schema_migrations (filename, applied_by, success)
VALUES ('000_ledger.sql', 'manual', TRUE)
ON CONFLICT (filename) DO NOTHING;
