# Deployment Guide — tourderotary.tz (cPanel / Passenger)

Production home for the backend: **cPanel host at `eunode3.zesha.net:2083`** (server IP `57.129.148.5`), Node.js via cPanel's **Setup Node.js App** (Passenger). The database is remote (**Supabase**), so the only thing this host runs is the Express API.

Frontend: deploy the canonical frontend (`github.com/smart01-bot/FRONTEND-TOURE-DE-ROTARY`) to **Vercel** and point it at this backend.

---

## 1. How the pieces fit

```
Browser → "tourderotary.tz" → DNS lookup → 57.129.148.5
        → LiteSpeed → Passenger → Express API → Supabase (remote)
                                    └→ PayMe / Textify / Resend
```

| Piece | Where it lives |
|---|---|
| **Backend API** | cPanel Node.js app → `api.tourderotary.tz` |
| **Frontend** | Vercel (or any Node host) → `tourderotary.tz` |
| **Database/Auth/Storage** | Supabase (remote — nothing DB-related runs on this host) |
| **DNS** | Already correct: nameservers `dns1/dns2/dns3.zesha.net`, `tourderotary.tz` A → `57.129.148.5`, `www` CNAME works |

> **DNS rule of thumb:** don't touch the Zone Editor unless adding an external service (e.g. a Vercel CNAME).

---

## 2. Prep on your machine (one-time)

1. **Trim dead deps** (optional but recommended for shared hosting): remove `bcrypt`, `redis`, `pg`, `pg-promise`, `jsonwebtoken`, `socket.io` from `package.json` — none are imported (see README → Known limitations). `bcrypt` would need server-side native compilation.
2. **Never upload `.env`** — env vars are entered in the cPanel UI instead.

---

## 3. cPanel steps, in order

Log in: `https://eunode3.zesha.net:2083` (or `tourderotary.tz/cpanel`).

### Step 1 — Create the API subdomain
**Domains → Create a New Domain** → `api.tourderotary.tz`. Uncheck "share document root", note the suggested path (e.g. `/home/tourdero/api.tourderotary.tz`). The DNS record is created automatically.

### Step 2 — Create the Node.js app
**Setup Node.js App → Create Application**:
- Node version: **20.x** (20.20.2 available)
- Mode: **Production**
- Application root: the subdomain folder from step 1
- Application URL: `api.tourderotary.tz`
- Startup file: `index.js`

### Step 3 — Environment variables
On the same screen, **Add Variable** for each (values from your local `.env`):

| Variable | Notes |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ service-role = full DB access; secure the cPanel account |
| `SUPABASE_ANON_KEY` | Token verification |
| `ALLOWED_ORIGINS` | `https://tourderotary.tz,https://www.tourderotary.tz,https://<vercel-domain>,http://localhost:3000` |
| `PAYME_API_KEY`, `PAYME_MERCHANT_CODE`, `PAYME_API_URL`, `PAYME_WEBHOOK_SECRET` | Webhook signatures become **mandatory** once the secret is set |
| `TEXTIFY_API_KEY`, `TEXTIFY_SENDER_ID`, `TEXTIFY_API_URL` | SMS |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL` | Email |
| `NODE_ENV=production` | `PORT` is set by Passenger — **don't** set it |

### Step 4 — Upload the code
Zip the backend **excluding** `node_modules`, `.env`, `logs/`, `.freebuff/`, `tourderotary-dsm/`, `.git`. Upload via File Manager into the app root and extract — or use **Git Version Control** for pull-to-deploy.

### Step 5 — Install & run
Node.js App screen → **Run NPM Install** → **Restart**.

### Step 6 — Migrations (run once)
cPanel **Terminal** (or SSH):
```bash
cd ~/api.tourderotary.tz
source ~/nodevenv/api.tourderotary.tz/20/bin/activate && cd ~/api.tourderotary.tz   # path shown on the app screen
npm run migrate          # ledger-tracked; idempotent; safe to re-run
npm run migrate:status   # verify: everything applied
```
> Migration 019 (`019_canonical_frontend_contract.sql`) is required for the canonical frontend — it adds the `posts` view, `fundraising_campaigns`/`donations` tables, registrations columns, and payment-order metadata. It is idempotent and safe to re-run.

### Step 7 — SSL
**SSL/TLS Status → Run AutoSSL** for `api.tourderotary.tz` (and the main domain if prompted).

### Step 8 — Verify
```bash
curl https://api.tourderotary.tz/api/v1/health          # expect "status":"healthy"
curl https://api.tourderotary.tz/api/v1/triathlon/overview
curl -H "Origin: https://tourderotary.tz" -X OPTIONS -o /dev/null -w "%{http_code}" https://api.tourderotary.tz/api/v1/challenges   # expect 204
```

### Step 9 — PayMe webhook
In the PayMe dashboard, point the webhook at:
```
https://api.tourderotary.tz/api/v1/payments/payme/webhook
```
(The canonical frontend sends a self-referencing `callback_url`; the PayMe dashboard setting is what actually routes callbacks — this backend's handler is the authoritative one.)

---

## 4. Frontend (Vercel)

1. Import `github.com/smart01-bot/FRONTEND-TOURE-DE-ROTARY` (branch `development`).
2. Environment variables:
   - `NEXT_PUBLIC_API_BASE_URL=https://api.tourderotary.tz/api/v1` (must include `/api/v1`)
   - `NEXT_PUBLIC_SITE_URL=https://tourderotary.tz`
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy → add the Vercel domain to backend `ALLOWED_ORIGINS`.
4. DNS for the apex: either point `tourderotary.tz` A record at Vercel's `76.76.21.21`, or serve the frontend from the cPanel host and keep DNS as-is.

Until the frontend is deployed, `http://localhost:3000` stays in `ALLOWED_ORIGINS` so local development keeps working against the live backend.

---

## 5. Gotchas that bite everyone

- **DNS propagation** for the new subdomain can take up to a few hours; test from a phone on mobile data if it seems dead locally.
- **404 on the subdomain before Step 5** is normal — the folder is empty until code lands.
- **"App not starting"** is 99% a missing env var — check stderr from the Node.js App screen.
- **Shared IP is fine** — many domains share `57.129.148.5`; the hostname routes correctly.
- **Rotate the cPanel password** if it was ever shared in chat (Password & Security).
- **Memory cap is 1 GB** — fine for this API, but never run `next build` on this host.

---

## 6. Post-deploy checklist

- [ ] `/api/v1/health` returns healthy over HTTPS
- [ ] AutoSSL certificates active on both domains
- `npm run migrate:status` — no pending
- [ ] CORS preflight 204 from the frontend origin
- [ ] PayMe webhook URL set in PayMe dashboard
- [ ] Test registration payment on a real phone (USSD prompt → webhook → ticket + bib)
- [ ] cPanel password rotated
