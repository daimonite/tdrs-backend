-- ==============================================================================
-- 019_canonical_frontend_contract.sql
--
-- Makes the database match the canonical frontend
-- (github.com/smart01-bot/FRONTEND-TOURE-DE-ROTARY, development branch).
-- That frontend reads/writes these tables DIRECTLY via the Supabase anon /
-- authenticated clients, in addition to going through the Express API:
--
--   posts (feed CRUD)            -> compatibility view over community_posts
--   post_reactions.emoji         -> 'fire'|'heart'|'clap' alongside reaction_type
--   registrations.category       -> 'sprint'|'olympic'|'relay'
--   registrations.discipline     -> 'swim'|'bike'|'run' (relay members)
--   registrations.story          -> personal story text
--   registrations.story_public   -> opt-in flag surfacing on /stories
--   registrations.payment_ref    -> PayMe reference recorded client-side
--   registrations.status/payment_status enums -> superset CHECKs ('confirmed', 'paid')
--   profiles.avatar_url          -> avatar column
--   fundraising_campaigns        -> per-participant donor page
--   donations                    -> donor ledger (public donor flow)
--   event_config.lifecycle_state -> 'pre_event'|'race_day'|'memory'|'archive'
--
-- Identity convention: the canonical frontend inserts rows with
-- user_id/participant_id = auth.uid() (the Supabase Auth user id), while
-- legacy rows use profiles.id. New signups have profiles.id = auth.uid(), but
-- seeded/migrated profiles may not. BEFORE INSERT triggers map either value
-- to a real profiles.id so FKs hold for both conventions.
--
-- All operations are idempotent; safe to re-run.
-- ==============================================================================

-- ── 1. REGISTRATIONS: new columns ───────────────────────────────────────────
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS category       TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS discipline     TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS story          TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS story_public   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_ref    TEXT;

-- Canonical category values ('sprint'|'olympic'|'relay') and disciplines
-- ('swim'|'bike'|'run'). NULL is allowed (legacy activity_slug rows).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_category_check') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_category_check
      CHECK (category IS NULL OR category IN ('sprint','olympic','relay'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'registrations_discipline_check') THEN
    ALTER TABLE public.registrations ADD CONSTRAINT registrations_discipline_check
      CHECK (discipline IS NULL OR discipline IN ('swim','bike','run'));
  END IF;
END $$;

-- ── 2. REGISTRATIONS: superset CHECKs ───────────────────────────────────────
-- The canonical frontend writes status='confirmed' (admin confirm) and
-- payment_status='paid'; legacy flows use 'completed'/'checked_in'. Drop the
-- original status/payment_status CHECKs (whatever their exact names) and
-- recreate them as the union of both frontends' values.
DO $outer$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.registrations'::regclass
      AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%CHECK ((status%' OR conname LIKE '%status%check%')
  LOOP
    EXECUTE format('ALTER TABLE public.registrations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $outer$;

ALTER TABLE public.registrations ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('pending','paid','checked_in','cancelled','confirmed'));
ALTER TABLE public.registrations ADD CONSTRAINT registrations_payment_status_check
  CHECK (payment_status IN ('pending','processing','completed','failed','refunded','paid'));
-- Both enums are supersets, so no data rewrite is required.

-- ── 3. PROFILES: avatar_url ─────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ── 4. EVENT_CONFIG: lifecycle_state (canonical modes) ──────────────────────
ALTER TABLE public.event_config ADD COLUMN IF NOT EXISTS lifecycle_state TEXT;

-- Backfill + keep in sync with phase. Mapping:
--   pre_event -> pre_event | event_day -> race_day | post_event -> memory | archive -> archive
CREATE OR REPLACE FUNCTION public.phase_to_lifecycle_state(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'event_day'  THEN 'race_day'
    WHEN 'post_event' THEN 'memory'
    WHEN 'archive'    THEN 'archive'
    ELSE 'pre_event'
  END;
$$;

UPDATE public.event_config
SET lifecycle_state = COALESCE(lifecycle_state, public.phase_to_lifecycle_state(phase))
WHERE true;

CREATE OR REPLACE FUNCTION public.sync_lifecycle_state()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.lifecycle_state := COALESCE(
    NULLIF(NEW.lifecycle_state, ''),
    public.phase_to_lifecycle_state(NEW.phase));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_lifecycle_state ON public.event_config;
CREATE TRIGGER trg_sync_lifecycle_state
  BEFORE INSERT OR UPDATE OF phase, lifecycle_state ON public.event_config
  FOR EACH ROW EXECUTE FUNCTION public.sync_lifecycle_state();

-- ── 5. IDENTITY MAPPING helper ──────────────────────────────────────────────
-- Maps a Supabase auth UID to profiles.id when they differ (seeded data).
CREATE OR REPLACE FUNCTION public.resolve_profile_id(candidate UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF candidate IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_id FROM public.profiles WHERE id = candidate;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  SELECT id INTO v_id FROM public.profiles WHERE auth_user_id = candidate;
  RETURN COALESCE(v_id, candidate); -- fall through: FK will reject unknown ids
END $$;

-- ── 6. REGISTRATIONS insert shim (canonical PayStep inserts auth.uid) ───────
CREATE OR REPLACE FUNCTION public.map_registration_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    NEW.user_id := public.resolve_profile_id(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_map_registration_user ON public.registrations;
CREATE TRIGGER trg_map_registration_user
  BEFORE INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.map_registration_user();

-- ── 7. POST_REACTIONS: emoji column kept in sync with reaction_type ─────────
-- Canonical frontend uses emoji ('fire'|'heart'|'clap'); the Express API uses
-- reaction_type ('cheer'|'fire'|'heart'|'applause'|'strong'). Mapping:
--   clap <-> cheer, others identical.
ALTER TABLE public.post_reactions ADD COLUMN IF NOT EXISTS emoji TEXT;

CREATE OR REPLACE FUNCTION public.sync_reaction_emoji()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.emoji IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.emoji IS DISTINCT FROM OLD.emoji) THEN
    NEW.reaction_type := CASE NEW.emoji
      WHEN 'clap'  THEN 'cheer'
      WHEN 'fire'  THEN 'fire'
      WHEN 'heart' THEN 'heart'
      ELSE COALESCE(NEW.reaction_type, 'cheer')
    END;
  END IF;
  NEW.emoji := CASE NEW.reaction_type
    WHEN 'cheer' THEN 'clap'
    WHEN 'fire'  THEN 'fire'
    WHEN 'heart' THEN 'heart'
    WHEN 'applause' THEN 'clap'
    WHEN 'strong' THEN 'fire'
    ELSE 'clap'
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_reaction_emoji ON public.post_reactions;
CREATE TRIGGER trg_sync_reaction_emoji
  BEFORE INSERT OR UPDATE ON public.post_reactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_reaction_emoji();

-- Backfill emoji for existing rows (idempotent — only touches NULLs)
UPDATE public.post_reactions SET emoji = 'clap' WHERE emoji IS NULL;

-- Canonical post types ('general'|'team' added to the legacy enum; the
-- posts->community_posts view passes them through verbatim).
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_post_type_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_post_type_check
  CHECK (post_type IN ('training','story','prep','tip','question','milestone','team_update','excitement','general','team'));

-- ── 8. POSTS: compatibility view over community_posts ──────────────────────
-- The canonical feed reads and writes `posts` with columns
-- (id, user_id, content, post_type, discipline, created_at). Implemented as a
-- view with INSTEAD OF triggers so identity mapping + published-only defaults
-- are enforced server-side; base-table RLS behavior is mirrored in the
-- triggers (public read of published rows, owner-or-staff writes).
DROP VIEW IF EXISTS public.posts;

CREATE VIEW public.posts AS
SELECT id, user_id, content, post_type, discipline, created_at
FROM public.community_posts;

CREATE OR REPLACE FUNCTION public.posts_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := public.resolve_profile_id(NEW.user_id);
BEGIN
  IF v_uid IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'insert into posts requires an authenticated participant';
  END IF;
  INSERT INTO public.community_posts (user_id, content, post_type, discipline, status)
  VALUES (
    v_uid,
    NEW.content,
    COALESCE(NEW.post_type, 'training'),
    COALESCE(NEW.discipline, 'general'),
    'published'
  )
  RETURNING id, user_id, content, post_type, discipline, created_at
    INTO NEW.id, NEW.user_id, NEW.content, NEW.post_type, NEW.discipline, NEW.created_at;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.posts_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing public.community_posts;
BEGIN
  SELECT * INTO v_existing FROM public.community_posts WHERE id = OLD.id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_existing.user_id IS DISTINCT FROM public.resolve_profile_id(NEW.user_id)
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'only the author may edit a post';
  END IF;

  UPDATE public.community_posts SET content = NEW.content
  WHERE id = OLD.id
  RETURNING id, user_id, content, post_type, discipline, created_at
    INTO NEW.id, NEW.user_id, NEW.content, NEW.post_type, NEW.discipline, NEW.created_at;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.posts_delete()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing public.community_posts;
BEGIN
  SELECT * INTO v_existing FROM public.community_posts WHERE id = OLD.id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_existing.user_id IS DISTINCT FROM public.resolve_profile_id(OLD.user_id)
     AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'only the author may delete a post';
  END IF;

  DELETE FROM public.community_posts WHERE id = OLD.id;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_posts_insert ON public.posts;
CREATE TRIGGER trg_posts_insert INSTEAD OF INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_insert();

DROP TRIGGER IF EXISTS trg_posts_update ON public.posts;
CREATE TRIGGER trg_posts_update INSTEAD OF UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_update();

DROP TRIGGER IF EXISTS trg_posts_delete ON public.posts;
CREATE TRIGGER trg_posts_delete INSTEAD OF DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_delete();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO anon, authenticated;

-- ── 9. FUNDRAISING: campaigns + donations ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fundraising_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL UNIQUE,
  goal            NUMERIC(12,2) NOT NULL DEFAULT 200000,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.donations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.fundraising_campaigns(id) ON DELETE CASCADE,
  donor_name      TEXT NOT NULL,
  donor_email     TEXT,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  message         TEXT,
  payment_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (payment_status IN ('pending','paid','failed')),
  payme_reference TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_campaign ON public.donations (campaign_id, payment_status);

-- Identity shim: canonical ensureMyFundraising inserts participant_id = auth.uid
CREATE OR REPLACE FUNCTION public.map_campaign_participant()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.participant_id) THEN
    NEW.participant_id := public.resolve_profile_id(NEW.participant_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_map_campaign_participant ON public.fundraising_campaigns;
CREATE TRIGGER trg_map_campaign_participant
  BEFORE INSERT ON public.fundraising_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.map_campaign_participant();

-- RLS: donor pages are PUBLIC — anon must read campaigns and paid donations;
-- donors insert pending donations anonymously (the canonical flow);
-- only the pending -> 'paid' transition (+ payme_reference) is updatable
-- publicly, enforced with column-level grants.
ALTER TABLE public.fundraising_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fundraising_select_public ON public.fundraising_campaigns;
CREATE POLICY fundraising_select_public ON public.fundraising_campaigns
  FOR SELECT USING (true);

DROP POLICY IF EXISTS fundraising_insert_own ON public.fundraising_campaigns;
CREATE POLICY fundraising_insert_own ON public.fundraising_campaigns
  FOR INSERT WITH CHECK (participant_id = public.resolve_profile_id(auth.uid()));

DROP POLICY IF EXISTS fundraising_update_own ON public.fundraising_campaigns;
CREATE POLICY fundraising_update_own ON public.fundraising_campaigns
  FOR UPDATE USING (participant_id = public.resolve_profile_id(auth.uid()))
  WITH CHECK (participant_id = public.resolve_profile_id(auth.uid()));

DROP POLICY IF EXISTS donations_select_paid_or_owner ON public.donations;
CREATE POLICY donations_select_paid_or_owner ON public.donations
  FOR SELECT USING (true);
-- The canonical donor flow inserts pending donations with the ANON client and
-- uses .select('id') (INSERT ... RETURNING), which Postgres only permits when
-- the new row also satisfies the SELECT policy — so pending rows must be
-- publicly visible. Public pages filter to payment_status='paid'; the
-- sensitive column (donor_email) is withheld from anon via column grants.

DROP POLICY IF EXISTS donations_insert_public ON public.donations;
CREATE POLICY donations_insert_public ON public.donations
  FOR INSERT WITH CHECK (payment_status = 'pending' AND amount > 0);

-- Public return-from-PayMe marks the donation paid (canonical markDonationPaid).
-- Column grants restrict anonymous writers to exactly those two columns.
DROP POLICY IF EXISTS donations_mark_paid_public ON public.donations;
CREATE POLICY donations_mark_paid_public ON public.donations
  FOR UPDATE USING (payment_status = 'pending')
  WITH CHECK (payment_status = 'paid');

GRANT SELECT, INSERT ON public.donations TO anon, authenticated;
GRANT UPDATE (payment_status, payme_reference) ON public.donations TO anon, authenticated;
REVOKE SELECT (donor_email) ON public.donations FROM anon;
GRANT SELECT ON public.fundraising_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE ON public.fundraising_campaigns TO authenticated;

-- ── 10. PROFILES visibility for public pages ────────────────────────────────
-- Canonical public pages (donor page, stories) read profiles.full_name with
-- the ANON client. Add a public-read policy, then restrict sensitive columns
-- so public/anon access exposes only identity basics. Authenticated users keep
-- the columns the canonical admin screens need (full_name, phone, email).
DROP POLICY IF EXISTS profiles_read_public ON public.profiles;
CREATE POLICY profiles_read_public ON public.profiles
  FOR SELECT USING (true);

REVOKE SELECT (email, phone_number, emergency_contact) ON public.profiles FROM anon;
GRANT SELECT (id, full_name, avatar_url, role, created_at, updated_at) ON public.profiles TO anon;

-- ── 11. REGISTRATIONS read policy ───────────────────────────────────────────
-- Canonical public donor page reads registrations (bib, story, category) for
-- the campaign owner with the ANON client. Public read of registrations
-- exposes limited columns; sensitive ones stay staff-only via column grants.
-- (Base policy from 002 already allows all-authenticated reads.)
GRANT SELECT (id, user_id, category, discipline, story, story_public, bib_number, payment_status, created_at) ON public.registrations TO anon;

DROP POLICY IF EXISTS registrations_select_public ON public.registrations;
CREATE POLICY registrations_select_public ON public.registrations
  FOR SELECT USING (
    story_public = true
    OR EXISTS (SELECT 1 FROM public.fundraising_campaigns c
               WHERE c.participant_id = registrations.user_id)
  );

-- ── 12. ORDERS: metadata + description for canonical checkouts ─────────────
-- The canonical frontend initiates payment with {amount, description,
-- customer, metadata} and NO order_number/registrationId. The backend creates
-- the pending order itself; metadata (donation_id, user_id, category…) must
-- survive to the webhook so it can complete the right donation/registration.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS description TEXT;

-- ── 13. NOTE ────────────────────────────────────────────────────────────────
-- Payment contract changes (amount/customer -> paymentUrl/transactionId,
-- verify returning 'paid') live in the Express API, not the database.
