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

## Verified integration points (2026-09-15)

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
