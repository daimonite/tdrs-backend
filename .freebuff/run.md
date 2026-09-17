# Run doc — Tour de Rotary DSM backend + frontend

This worktree is the main checkout: Express API in the repo root, Next.js
frontend as the `tourderotary-dsm/` submodule.

## Reproduce the artifacts (fresh checkout)

1. Backend env: copy `.env` from the main checkout (backend repo root).
   Required keys: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_ANON_KEY`, `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`,
   plus optional PayMe/Textify/Resend keys. Never commit or paste secret values.
2. Frontend env: copy `tourderotary-dsm/.env.local` from the main checkout.
   Required keys: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8800/api/v1`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same Supabase
   project as the backend).
3. Backend deps: `npm ci` in the repo root.
4. Frontend deps: `npm ci` inside `tourderotary-dsm/` (if `node_modules` absent).
5. Database: apply `migrations/001`–`014` in order to the Supabase project
   (migration `014` also seeds test accounts and demo data).

## Run the servers

- Backend (port 8800, default): `npm start` (or `node index.js`) in the repo
  root. Health: `GET http://localhost:8800/api/v1/health`.
- Frontend (port 3000): `npm run dev` inside `tourderotary-dsm/`.
  IMPORTANT: `tourderotary-dsm/.env.local` must say `PORT=3000` — a stale
  `PORT=8800` collides with the backend and Next silently falls back to a
  random port (breaking the backend's CORS allow-list). Fixed 2026-09-15.
- Do not run a second frontend instance while one is already listening on
  3000 — Next dev instances clash over `.next`.
- Detached start (Windows) used for BOTH servers — WMI/Start-Process with a
  `cmd /c` wrapper and explicit PORT. Two traps discovered 2026-09-15:
  (1) The spawned-process environment can carry `PORT=0`; dotenv does not
  override existing env vars, so the backend silently binds port 0
  ("RUNNING ON PORT 0" in the log). Always launch with `cmd /c "set PORT=8800&& node index.js ..."`.
  (2) Next.js reads PORT before loading `.env.local`, so a stale PORT value
  there is ignored anyway — pass the port explicitly: `node
ode_modules\next\dist\bin\next dev -p 3000`.
  Recipe: `powershell -NoProfile -Command "Invoke-CimMethod -ClassName
  Win32_Process -MethodName Create -Arguments @{CommandLine='cmd /c
  \"set PORT=8800&& node index.js > log.txt 2>&1\"'; CurrentDirectory='<dir>'}"
  (or Start-Process with `-RedirectStandardOutput`/`-RedirectStandardError`
  pointing at DIFFERENT files). Plain `&`-backgrounded shells die with the
  console on this machine.
- When launching detached from bash, redirect the powershell call's own
  stdout to a file (`powershell ... > pid.txt 2>&1`): npm.cmd inherits the
  captured stdout pipe otherwise and bash hangs forever waiting for EOF
  even though PowerShell itself exits.
- Test accounts for the seeded dev database: see migration
  `migrations/014_complete_frontend_backend_sync.sql` §5 (passwords are in
  that committed file; do not reuse them anywhere real).

## Verified integration points (2026-09-15, re-verified after new triathlon/community batch)

NOTE (2026-09-15, later): a large new batch landed (controllers team/challenge/
whyIParticipate/bib/photo/results/community/triathlon + routes + migrations
015-017 + 3 worker services). It shipped with two boot-breaking bugs, both
fixed:
  1. All 8 new controllers imported a nonexistent `config/supabaseClient.js`
     (real client: `config/supabase.js`, default export) — backend could not
     boot at all.
  2. New route files used bare `auth`/`{ authenticate }`/`{ authorize }` in
     route chains. `auth` is a middleware FACTORY — bare usage makes Express
     call the factory as middleware, which returns the inner function without
     calling next(), so requests HANG forever (no response, no timeout).
     Correct pattern: `auth()` inline, `requireRole([...])` from rbac.js.
     This hang is silent — always test a protected route after wiring it.

PENDING (needs Supabase dashboard access, not code): migration
`017_tour_de_dar_triathlon_and_community.sql` has NOT been applied to the
database. Until it is, `/api/v1/teams`, `/api/v1/challenges`,
`/api/v1/community/posts`, `/api/v1/stories`, `/api/v1/results`,
`/api/v1/bibs`, `/api/v1/triathlon/map`, `/api/v1/triathlon/impact` return
500 with PGRST205 ("Could not find the table ... in the schema cache"), and
`/api/v1/triathlon/overview` returns 200 with empty stages/categories.
Auth gating on all of these is verified working (401s, no hangs).

NOTE (2026-09-15, schema-alignment audit): the 8 new controllers were
written against columns that DO NOT exist in 017's DDL and would have 500'd
forever even after the migration landed. All were rewritten against the
real schema — the key traps for future work:
  - `community_posts` uses `user_id`/`status` ('published'|'flagged'|'hidden')
    and denormalized `likes_count`/`comments_count` (no trigger in 017 —
    communityController syncs them after reactions/comments).
  - Challenges live in `challenges`/`user_challenges` (017). There is NO
    `pre_race_challenges` table. `completion_count` is incremented via the
    `increment_challenge_completion` SQL function (appended to 017).
  - `why_i_participate` stores `quote` + `display_name` (NOT NULL) — not
    `story_text`. Approval gates the public read on `is_approved`
    (ALTER added to 017).
  - `triathlon_results` ranks are `rank_overall`/`rank_category`/
    `rank_gender`, category is `category_slug` — NOT `overall_rank`/
    `category_id`. There is no `profiles.community_points` column.
  - `race_photos` has NO `is_published` column (all rows are public) and
    `bib_numbers` is TEXT[] — string arrays, not ints.
  - `teams` requires a UNIQUE `slug` (generated from the name) and keeps a
    denormalized `member_count` (synced by teamController).
  - `digital_bibs.generateBib` upserts `onConflict:'user_id'` — legal only
    with the `uq_digital_bibs_user` unique index (added to 017).
  - PostgREST embeds (`profiles:user_id (...)`) resolve by the FK's own
    column name, not the referenced table's uniqueness — no ambiguity here.

§15 MODERATION (brief requirement) — implemented: POST
`/community/posts/:postId/report` (any participant; reasons spam/abuse/
inappropriate/misinformation/other), GET `/community/reports` + PATCH
`/community/posts/:postId/moderate` (admin). Backed by a `post_reports`
table (appended to 017; idempotent per reporter+post; flagged posts leave
the public feed, moderation decisions resolve open reports + write
audit_logs).

§17 EVENT LIFECYCLE — social writes (post/react/comment) are gated by
`event_lifecycle.current_mode`: writes succeed only in LIVE mode and get
403 SOCIAL_CLOSED in MEMORY/ARCHIVE; reads stay open. Fails OPEN if the
table/row is missing (pre-017), so the gate never takes the API down.

- Frontend session token → backend `Authorization: Bearer` on
  `/api/v1/participant/profile`, `/api/v1/tickets` (200).
- CORS preflight from `http://localhost:3000` → 204.
- `POST /api/v1/newsletter/subscribe` → 201 (the frontend's live API call).
- `GET /api/v1/payments/verify/:registrationId` → 200.
- `POST /api/v1/collectibles/frame`, `GET /api/v1/admin/orders`,
  `/api/v1/admin/export/registrations.csv` → 200 (after the
  `profiles:profile_id` embed disambiguation fixes).
- Known gap: frontend has no checkout UI wired to
  `POST /api/v1/payments/initiate` yet; event date differs between frontend
  config (1 Nov 2026) and DB seed (18 Oct 2026).
- 2026-09-15 unauthenticated suite (post-alignment): health 200, CORS 204,
  newsletter 201, payments-initiate 502 (PayMe unconfigured — expected),
  community/teams/challenges/stories/photos 500 (PGRST205 only — 017
  pending), bibs/me + all social writes 401 fast (no hangs),
  leaderboard?board=bogus 400, triathlon overview + live-activity 200.
  The migration-017 paste must happen in the Supabase SQL editor; after it
  lands, re-run the suite and expect the 500s to become 200/201/401.

NOTE (2026-09-17, preview restart + 4th-phase fix): the registered preview
died with the previous session; relaunched the frontend with Start-Process
(node.exe + `next dev -p 3000` directly, no npm wrapper, no cmd — the WMI
`cmd /c` variant silently failed to launch this time). Backend survived on
8800 and stayed healthy. The fresh page then crashed with an Unhandled
Runtime Error in PhaseBanner.tsx: the DB's `event_config.phase` allows a
FOURTH value `archive` (migration 001 CHECK constraint; brief §17's
ARCHIVE state) but the frontend only typed three phases, so
`bannerConfig['archive']` was undefined. Fixed additively across the
frontend: `EventPhase` type + PHASE_LABELS/PHASE_COLORS + PhaseBanner
(archive config + safe fallback for any unknown phase) + PhaseContext /
lib/phase isPostEvent treating archive as post-event + PhaseBadge + HQ
command page PHASE_META. Typecheck clean; page renders in archive mode
(memory-remains banner, no countdown). Do not remove the `archive` entry
from these records when touching phase code.
