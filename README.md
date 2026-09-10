# Tour de Rotary DSM 2026 — Backend

Backend API for **Tour de Rotary Dar es Salaam 2026** — registration, ticketing,
merchandise, payments (mobile money via PayMe Africa), SMS/email automation,
and a role-gated admin console, built on **Node.js / Express 5** with
**Supabase (PostgreSQL)** as the data layer.

This README describes what's actually implemented and running today, not the
full target platform. Where a feature is scaffolded but not complete, that's
called out explicitly rather than listed alongside finished work — see
[Known limitations](#known-limitations).

---

## Contents

1. [Architecture](#architecture)
2. [Setup](#setup)
3. [API reference](#api-reference)
4. [Security model](#security-model)
5. [Known limitations](#known-limitations)

---

## Architecture

```
Client (web/mobile) ── HTTPS/JSON ──▶ Express API (port 8800)
                                        │
                         Helmet, CORS, body-parser, cookie-parser
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
              auth() + rbac()    rate limiting        controllers
           (Supabase Auth token   (express-rate-limit  (19 modules —
            → profiles.role)      on guest-facing       see API ref)
                                   payment routes)
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        │
                     Supabase client, SERVICE_ROLE key
                     (bypasses RLS — see Security model)
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
             PostgreSQL (Supabase)  PayMe Africa      Textify (SMS) /
                                    (mobile money)     Resend (email)
```

**Runtime:** Node.js, ESM (`"type": "module"`), Express 5.

**Key dependencies** (from `package.json`): `@supabase/supabase-js`,
`express-rate-limit`, `helmet`, `cors`, `bcrypt`, `jsonwebtoken`,
`express-validator`, `winston`, `redis`, `socket.io`.

`redis` is a listed dependency and `config/redis.js` will attempt a live
connection at import time, but nothing in the app currently imports it —
`services/queueService.js` references it and a `../models/request.js` that
doesn't exist in this repo, so that file is dead code left over from another
project. It's inert as long as nothing imports it, but it should either be
finished or deleted rather than left half-wired.

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project (Postgres + Auth)
- PayMe Africa merchant credentials (for real payments — optional for local dev)
- Textify Africa and Resend API keys (for SMS/email — optional for local dev)

### Install

```bash
npm install
cp .env.example .env   # then fill in the values below
node index.js
```

The server listens on `PORT` (default `8800`) and exposes a health check at
`GET /api/v1/health`.

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `PORT` | no | defaults to `8800` |
| `ALLOWED_ORIGINS` | yes (prod) | comma-separated; no wildcard with credentialed CORS |
| `SUPABASE_URL` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | backend uses this — bypasses RLS, see [Security model](#security-model) |
| `SUPABASE_ANON_KEY` | yes | used to verify participant-issued auth tokens |
| `PAYME_API_KEY`, `PAYME_MERCHANT_CODE`, `PAYME_API_URL` | for real payments | |
| `PAYME_WEBHOOK_SECRET` | **strongly recommended** | if unset, incoming webhooks are accepted unsigned — see [Security model](#security-model) |
| `TEXTIFY_API_KEY`, `TEXTIFY_SENDER_ID` | for SMS | |
| `RESEND_API_KEY`, `EMAIL_FROM` | for email | |
| `STRAVA_CLIENT_ID/SECRET` | not yet used | fitness sync is unimplemented, see below — safe to leave blank |

`index.js` fails fast if `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are
missing, rather than silently falling back to an unconfigured client.

## API reference

All routes are mounted under `/api/v1`. "Auth" = `auth()` middleware
(validates a Supabase session token and attaches `req.user`); "Role" =
`requireRole([...])` on top of that.

| Base path | Auth | Purpose |
|---|---|---|
| `/activities` | — (public) | list/get race activities |
| `/merchandise` | — (public) | list/get merch catalogue |
| `/content` | — (public) | phase-aware CMS content blocks |
| `/campaigns` | — (public) | landing pages, campaign tracking |
| `/newsletter` | — (public) | subscribe |
| `/cart` | — (guest checkout) | `POST /checkout` — creates profile/order without requiring a prior login |
| `/payments` | — (rate-limited, see below) | `initiate`, `payme/webhook`, `status/:order_number`, `verify/:transactionRef`, `retry` |
| `/social` | mixed | Twibbon frame list/generate, OG card lookup |
| `/collectibles` | mixed | certificate verification (public), issuance (internal) |
| `/tickets` | auth | my tickets, QR lookup, check-in |
| `/participant` | auth | profile, orders, tickets, certificates, training, wishlist, referrals, incidents |
| `/volunteer` | auth + role | shift info, briefing ack, ticket check-in |
| `/sponsor` | auth + role | portal, logo upload |
| `/partner` | auth + role | clearances |
| `/communications` | auth + role | templates, preview, test-send, logs |
| `/comms` | auth + role | direct SMS/email send |
| `/evaluation` | mixed | survey submit (public), results/impact report (internal) |
| `/fitness` | auth | **not implemented**, see below |
| `/admin` | auth + `role: admin` | dashboard, orders, users, inventory, content, audit logs, promo codes, capacities, refunds, incidents, CSV exports (`export/registrations.csv`, `export/revenue.csv`) |

Cart/checkout and the payment routes are intentionally reachable without a
login — that's a deliberate guest-checkout design, not an oversight — but it
means `order_number` is the only thing gating access to those endpoints, so
they're rate-limited instead of auth-gated (see [Security
model](#security-model)).

## Security model

A few things worth understanding before extending this backend:

- **The backend talks to Supabase with the service-role key**, which bypasses
  Row-Level Security entirely. That's a normal pattern for a trusted backend,
  but it means **RLS provides no safety net here** — every authorization
  decision has to be made correctly in `middleware/auth.js` /
  `middleware/rbac.js` and in each controller. There is no second line of
  defense.
- **PayMe webhook signatures are mandatory whenever `PAYME_WEBHOOK_SECRET` is
  set.** `handlePayMeWebhook` also cross-checks the reported amount against
  the order's actual `total_tsh` before recording a payment, rather than
  trusting the webhook payload's amount field.
- **Guest checkout means payment routes can't require a login session.**
  `order_number` (`TDR-2026-#####`, a 5-digit space) is the only thing
  protecting `status/verify/retry`, so those routes carry
  `express-rate-limit` limiters instead. Rate limiting is currently
  in-memory (per-process) — fine for a single instance, but it resets on
  restart and doesn't share state across horizontally scaled instances. If
  this ever runs behind more than one process, move the limiter store to the
  `redis` client that's already a dependency.
- **`participant/tickets` fails closed on identity resolution.** If a
  session has no resolvable email, the endpoint returns 403 rather than
  falling through to an unfiltered query — this used to fail *open*, which
  would return every participant's ticket data including their QR
  check-in tokens.

## Known limitations

Things a proposal/spec doc for this project describes that aren't live yet —
called out here explicitly so nobody mistakes the schema for the feature:

- **Fitness/Strava sync is unimplemented.** `GET /fitness/status` and `POST
  /fitness/strava/sync` return `501 NOT_IMPLEMENTED`. The controller says so
  directly in a comment (deferred pending third-party approval) — this is
  the one area of the codebase that's upfront about not being done, rather
  than faking a response.
- **Digital collectibles are off-chain only.** `issueCollectible` writes a
  serial number and a locally-generated verification hash to
  `digital_collectibles`. The table has `on_chain_network` /
  `on_chain_tx_hash` columns and there's a Polygon reference in a code
  comment, but nothing in this codebase ever mints anything or writes to
  those columns — there's no chain SDK in `package.json`. Treat "on-chain
  collectible" as schema scaffolding for future work, not a live feature.
- **The Twibbon/frame generator doesn't process an uploaded photo.** There's
  no file-upload middleware or image-compositing library anywhere in the
  app. `generatePublicFrame` takes a name/label and returns an SVG text
  badge, not a composited photo+frame PNG. `getOpenGraphCard` also returns
  an `og:image` URL pointing at a PNG that nothing in this repo generates or
  stores.
- **`services/queueService.js` is dead code** referencing a `models/`
  directory that doesn't exist in this repo (see [Architecture](#architecture)).

Everything else described in this README — auth/RBAC, checkout, payments
(with the webhook/amount validation above), tickets and check-in, admin CSV
exports and audit logging, SMS/email sending — is implemented and wired to a
route.
