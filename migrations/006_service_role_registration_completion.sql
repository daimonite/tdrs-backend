-- =============================================================================
-- 006 — Service-role registration completion (webhook contract)
-- =============================================================================
-- The PayMe webhook completes the originating registration after a successful
-- charge: status 'confirmed', payment_status 'completed', amount_tsh, and the
-- issued bib_number. Those are protected columns: protect_registration_columns()
-- (migration 002) only lets staff profiles change them, and the backend's
-- service-role client has no auth.uid() — so profiles.current_role() is NULL
-- and the webhook update was silently rejected, leaving a PAID order attached
-- to a PENDING registration (ticket issued, dashboard never confirms).
--
-- This restores the allowance that lived in the legacy chain (old migration
-- 016, dropped during the 000–005 cleanup): the platform service role — the
-- server-to-server identity used by the payment webhook — may write protected
-- registration columns. It is not obtainable by clients: Supabase only issues
-- service_role JWTs from server-side keys.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.protect_registration_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_staff() THEN
    RETURN NEW;
  END IF;
  -- Server-to-server payment completion (PayMe webhook → registrations):
  -- the backend authenticates with the service-role key, which carries
  -- role=service_role and no user id. This identity never reaches PostgREST
  -- from a browser, so it cannot be spoofed by a client.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.activity_slug IS DISTINCT FROM OLD.activity_slug
     OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.amount_tsh IS DISTINCT FROM OLD.amount_tsh
     OR NEW.bib_number IS DISTINCT FROM OLD.bib_number
  THEN
    RAISE EXCEPTION 'Only staff may change fields other than status';
  END IF;
  RETURN NEW;
END;
$$;
