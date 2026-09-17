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

## Audit gaps 11–20 FIXED (2026-09-17)

Backend changes (running, verified live):
- `middleware/apiHygiene.js` — NEW: `clampPagination` (limit capped at 100) + `readLimiter`/`writeLimiter`/`mutationLimiter`. Wired into community, teams, challenges, stories, photos, results, triathlon routes. `req.pagination` is consumed by getPosts/getTeams/getStories/getPhotos/getResults (getPostReports clamps inline).
- `controllers/consentController.js` + `routes/consentRoutes.js` — NEW consent API (§18): GET/PUT/DELETE `/api/v1/consent` (self-service), GET `/consent/summary` (admin, aggregated). Mounted in index.js.
- `controllers/eventContentController.js` — NEW: waypoint CRUD (`POST/PATCH/DELETE /triathlon/waypoints`) and category+wave admin (`POST/PATCH /triathlon/categories`) — gaps 12 & 13.
- `communityController.createPost` — persists full `media_urls` array (needs migration 018's column; falls back gracefully until applied: insert will error on missing column ONLY after 018? No — insert includes media_urls key; Supabase REST ignores unknown columns? NO, it rejects. NOTE: run migration 018 BEFORE deploying this — on the current DB, posts with media_urls in the payload fail. The field is always sent; if 018 is not yet applied, create posts will 500. So APPLY 018 FIRST.)
- `services/phaseEngineService.js` — reconciles `event_config.phase` AND `event_lifecycle.current_mode` every 60s cycle against the derived phase; heals manual drift (gap 17/23); audit-logs corrections.
- `migrations/018_audit_fixes.sql` — NEW: `media_urls` TEXT[] column, UNIQUE(user_id, activity_slug) on registrations (dedupes pending dups first), RLS tightening (bibs denied to anon, results/bibs pinned, stories approved-only, user_challenges owner-read, consent owner-read). **MUST be pasted in Supabase SQL Editor** — the feed write path and the RLS fixes activate only when it lands.

Frontend changes:
- `(hq)/layout.tsx` — staff-only gate (admin/hq_admin) redirecting others to `/login?next=/hq` (gap 16).
- `lib/supabase/queries/admin.ts` — updateSponsorStatus/updatePartnerStatus/updateProductStock now write audit rows (gap 18); type-check passes.

Tests/CI (gap 20):
- `tests/contract.test.js` — 22 tests, ALL PASSING against localhost:8800.
- `.github/workflows/ci.yml` — backend syntax sweep + contract tests; frontend typecheck + build.

Verification: 12/12 curl checks pass (clamps return limit:100, RateLimit-Policy headers present, 401s clean, bogus team type 400, consent gated). Phase engine reconcile proven by isolated run; DB now consistent (config=pre_event, lifecycle=live).

## Audit gaps 23-29 FIXED (2026-09-17)

- Gap 23 (reconcile): confirmed live from the 11-20 session — engine now reconciles config/lifecycle every cycle. DB verified consistent (config=pre_event, lifecycle=live).
- Gap 24 (ARCHIVE reachable): phase engine derives `archive` after `config_json.archive_after_days` (default 30) post-event days; event_editions caps at post_event (its CHECK has no archive), config/lifecycle go to archive. Engine advances lifecycle live->archive itself.
- Gap 28 (stale metadata): engine clears contradictory archive_date/memory_mode_unlocked_at when mode is live (found live in DB from the 11:13 incident — now NULL), and migration 018 section 5 cleans it SQL-side too. Bug found during fix: the engine read only selected current_mode, so metadata drift was invisible; select widened.
- Gap 25 (UTC-day bug): NEW utils/darTime.js — darToday()/darDateOffset() via Intl with Africa/Dar_es_Salaam; challengeController's four `toISOString().slice(0,10)` comparisons replaced (list/join/create/end).
- Gap 26 (duplicate registrations): createRegistration (frontend) now checks for an existing non-cancelled registration first and returns it with existing:true; register page handles both paths. DB UNIQUE arrives with migration 018.
- Gap 27 (env hygiene): .env.local UNTRACKED from frontend repo (git rm --cached; no secret was in it — only NEXT_PUBLIC_* values); NEW frontend .gitignore (env files, .next, tsbuildinfo).
- Gap 29 (migration ledger): NEW migrations/000_ledger.sql (exec_sql RPC + schema_migrations table; apply ONCE manually), NEW scripts/migrate.js runner (npm run migrate / migrate:status; refuses 000_ledger with instructions; records success/failure per file), wired into package.json.

Verification: syntax sweep OK; backend restarted (PID changes each restart — check netstat :8800); 22/22 contract tests pass; tsc --noEmit clean; frontend 200; engine runs clean and cleared the stale archive_date (verified in DB).

Ops note: migrations/000_ledger.sql needs ONE manual paste in Supabase SQL editor; after that `npm run migrate` applies 018 (and everything after) automatically.

## Audit gaps 1-10 — verified + closed (2026-09-17)

Most of 1-10 were built in a prior session; this round VERIFIED each end-to-end and closed the one real hole:

- Gap 1 (results ingest): ingestResults + ingestResultsCsv + updateResult + deleteResult exist, admin-gated, CSV parser handles header aliases + time formats + dedupe. VERIFIED: routes mounted, 401 without token.
- Gap 2 (bib auto-issue): lazy-issue existed in GET /bibs/me; the REAL gap was that the PayMe webhook minted tickets without creating digital_bibs rows. FIXED: webhook now calls autoIssueBibForUser right after each ticket insert (fails soft — never blocks payment). Bib now exists the moment payment lands.
- Gap 3 (challenge CRUD): create/update/delete/endChallenge all exist, admin-gated, routes mounted. VERIFIED.
- Gap 4 (photo upload): uploadPhoto/batchUploadPhotos/deletePhoto exist w/ Supabase Storage base64 path + admin/volunteer gating. VERIFIED.
- Gap 5 (discipline leaderboards): performance/swim/bike/run/community/participation boards all live (200 on each). VERIFIED.
- Gap 6 (aggregate profile): getParticipantProfile already aggregates tickets, orders, digital bib, team, challenges+badges, race result, post/story counts in one call. VERIFIED.
- Gap 7 (own-content delete): deletePost/deleteComment author-or-staff logic, routes mounted. VERIFIED 401-gated.
- Gap 8 (consent API): consentController + routes from the 11-20 round. VERIFIED.
- Gap 9 (team discussions): getTeamDiscussions/postTeamDiscussion mounted. VERIFIED.
- Gap 10 (phase reconcile): phaseEngineService reconciles every 60s cycle. VERIFIED in 23-29 round.

Verification: syntax sweep clean, backend restarted on :8800, all 10 gate-checks return correct 401/200, 22/22 contract tests pass, frontend typecheck clean.

## Gaps 21-22 CLOSED (2026-09-17)

- Gap 21 (health check): /api/v1/health now pings the DB for real (head-count on event_config) and reports { status: healthy|degraded, checks.database: {status, latency_ms} } — returns 503 when the DB is unreachable so monitoring actually catches outages. Verified live: database up, 726ms latency reported.
- Gap 22 (logging + shutdown):
  - morgan@1.10.1 installed; services/loggingService.js exports morganMiddleware — every request is written through winston as structured JSON to logs/combined.log + logs/error.log (>=400 warn, >=500 error), with health/OPTIONS skipped.
  - Graceful shutdown: all three background worker intervals registered in workerIntervals and cleared on shutdown; server.close() drains in-flight requests with a 10s force-exit timeout; SIGTERM + SIGINT handlers wired (idempotent).
  - Verified live: access lines appear in logs/combined.log; backend restarted on :8800; 22/22 contract tests still pass.

Ops note: logs/ dir is created at first write; add logs/ to .gitignore. Windows note: taskkill //F does NOT exercise SIGTERM handlers (hard kill) — real signal testing needs proper process signals on deploy.
