# Tour de Dar 2026 — Database Migrations & Supabase Setup

The migration history has been consolidated into **one clean, sequential chain** that provisions a fresh Supabase project from zero:

```
000_ledger.sql                    runner bootstrap (exec_sql RPC + schema_migrations ledger)
001_schema.sql                    all tables, extensions, indexes
002_triggers_rls.sql              functions, triggers, Row-Level Security
003_seed.sql                      baseline data + test accounts (password: user1234)
004_audit_fixes.sql               RLS tightening, multi-image posts, uniqueness
005_canonical_frontend_contract.sql  canonical-frontend schema (posts view, fundraising, …)
```

Files run in filename order via `npm run migrate`. Each is idempotent; the ledger (`schema_migrations`) records what has been applied. The pre-consolidation patch files (legacy 001–019) are archived in `legacy/` — reference only, never run.

---

## Part A — Create the Supabase project

1. **Create a project** at [supabase.com](https://supabase.com) (any region close to your users; Dar es Salaam is served well by `eu-central-1` / `ap-southeast-1`).
2. **Collect the credentials** — Supabase Dashboard → **Project Settings → API**:
   - `Project URL` → this is `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server-only — never expose in a frontend bundle**)
3. **Note the database password** if you ever need direct Postgres access (Settings → Database). The app itself never uses it — everything goes through the REST API with the two keys above.

## Part B — Backend configuration

In the backend repo root, create `.env` (copy `.env.example`):

```bash
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # service_role key
SUPABASE_ANON_KEY=eyJ...           # anon public key
# everything else (PayMe, Textify, Resend…) can stay empty until needed
```

## Part C — Run the migrations

### The one-time manual step: `000_ledger.sql`

The runner executes SQL through an RPC (`exec_sql`) that it cannot create itself — chicken-and-egg. So apply exactly one file by hand:

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste the entire contents of `migrations/000_ledger.sql`
3. **Run** — it creates `exec_sql`, the `schema_migrations` ledger, and marks itself applied

This only ever happens once per Supabase project.

### Everything else: the runner

```bash
npm run migrate            # applies pending files in order, records each in the ledger
npm run migrate:status     # shows applied vs pending — the source of truth
```

Expected output on a fresh project:

```
migrate: 6 migration files, 1 applied, 5 pending
migrate: applying 001_schema.sql ...
migrate: OK 001_schema.sql
...
migrate: done
```

Re-running is always safe: applied files are skipped, and every file's statements are guarded (`IF NOT EXISTS`, `DROP ... IF EXISTS`).

### Alternative: paste-everything-by-hand

If you cannot run Node where this repo is checked out, paste `001 → 002 → 003 → 004 → 005` into the SQL editor **in that exact order** (each file states its position in its header). Then insert ledger rows so a later `npm run migrate` doesn't re-apply them:

```sql
INSERT INTO public.schema_migrations (filename, applied_by, success) VALUES
  ('001_schema.sql', 'manual', true),
  ('002_triggers_rls.sql', 'manual', true),
  ('003_seed.sql', 'manual', true),
  ('004_audit_fixes.sql', 'manual', true),
  ('005_canonical_frontend_contract.sql', 'manual', true);
```

## Part D — Storage (race photos)

The photo endpoints upload to a Storage bucket named **`race-photos`**. Create it once:

Dashboard → **Storage** → New bucket → name `race-photos` → **Public** (race photos are served by public URL).

Without it, photo upload returns an error but nothing else breaks.

## Part E — Verify

```bash
npm run migrate:status                       # 6 files, 0 pending
curl http://localhost:8800/api/v1/health     # "status":"healthy" (needs backend running)
```

Seeded test accounts (password `user1234` for all): `user@gmail.com` (HQ), `admin@gmail.com`, `participant@gmail.com`, `volunteer@gmail.com`, `sponsor@gmail.com`, `partner@gmail.com`.

---

## What each file actually contains

| File | Contents |
|---|---|
| `000_ledger.sql` | `exec_sql` RPC (service-role only, rejects WHERE-less UPDATE/DELETE) + `schema_migrations` ledger table. |
| `001_schema.sql` | Extensions (`uuid-ossp`, `pgcrypto`) and all tables: identity (event_editions, profiles), commerce (orders, order_items, payments, inventory_reservations, products/variants, promo_codes, referrals), registration (registrations, activities, tickets, digital_bibs), community (community_posts, post_reactions, post_comments, teams, team_members, challenges, user_challenges), event ops (triathlon_stages, race_categories, map_waypoints, race_photos, triathlon_results, volunteer_*), comms/CMS (communication_queue, content blocks, event_config, event_lifecycle, audit_logs) and supporting tables. |
| `002_triggers_rls.sql` | Security helpers (`current_profile_id`, `is_staff`, `is_volunteer_or_staff`); auth-signup→profile trigger with unique referral codes; registrations→orders/tickets sync; merch variant/stock sync; 3-way phase sync with recursion guard; audit-log view; full RLS policy set. Every trigger/policy is DROP-guarded. |
| `003_seed.sql` | 2026 event edition, default config, triathlon stages + race categories + waypoints, challenges, merch products, impact projects, and the seven test accounts (bcrypt via `pgcrypto`). |
| `004_audit_fixes.sql` | `community_posts.media_urls`, duplicate-registration cleanup + uniqueness constraint, RLS lockdown on digital_bibs/user_challenges/results/consents, stale lifecycle cleanup. |
| `005_canonical_frontend_contract.sql` | `posts` view over `community_posts` (+ INSTEAD-OF triggers, canonical post types `general`/`team`), `registrations.category/discipline/story/story_public/payment_ref`, emoji↔reaction_type sync, `fundraising_campaigns` + `donations` with public donor RLS, `profiles.avatar_url`, `event_config.lifecycle_state`, `orders.metadata/description`, auth-uid identity-mapping triggers. |

## Rules for future migrations

1. **Next number, never reuse**: `006_<what_it_does>.sql`.
2. **Idempotent only**: `IF NOT EXISTS` / `DROP ... IF EXISTS` guards; every `UPDATE` carries a `WHERE` (the `exec_sql` guard rejects WHERE-less UPDATE/DELETE).
3. **Never edit an applied file** — the ledger has its hash-less name; changing content after application creates drift between repo and database. Write a new file instead.
4. `legacy/` is frozen history — do not execute or modify.
