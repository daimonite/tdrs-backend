# Frontend/backend integration

## What now matches

The frontend repository (`smart01-bot/tourderotary-dsm`, main branch) uses
Supabase directly for its primary data. Migration `006_frontend_contract.sql`
adds its required database contract: `event_config`, `registrations`,
`products`, `shifts`, `volunteer_shifts`, `sponsors`, `sponsor_assets`,
`partners`, `partner_deliverables`, `audit_log`, and the missing frontend
columns on `profiles`, `orders`, and `order_items`.

It also accepts either profile identity convention used by the two projects:
the backend's `profiles.auth_user_id` or the frontend's `profiles.id` equal to
the Supabase Auth user ID. A frontend `hq_admin` profile is authorized as a
backend `admin` for protected API endpoints.

`POST /api/v1/newsletter/subscribe` now matches the one API call that the
frontend actively makes. Set this in the frontend environment:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8800/api/v1
NEXT_PUBLIC_SUPABASE_URL=<same Supabase project as the backend>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<same project's anon key>
```

## Important remaining boundary

The registration, merchandise, volunteer, sponsor, partner, and HQ screens
still call Supabase directly; they do not call Express. They will use the
compatibility tables after the migration, but they do not exercise backend
controllers. The prospective wrappers in `src/lib/api.ts` are not wired into
those screens. In particular, its payment payload (`registrationId`,
`amountTSh`, `phone`) differs from the backend payment payload
(`order_number`, `amount_tsh`, `phone_number`). Do not point payment UI at the
backend until one side is converted to a single contract.

## Local test sequence

1. Create a fresh Supabase development project. Apply migrations `001` through
   `006` in order, then the seed. Do not run the seed against production data.
2. In this backend, copy `.env.example` to `.env` and set `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, and:

   ```env
   PORT=8800
   NODE_ENV=development
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. Run `npm ci`, then `npm start`. Confirm `GET http://localhost:8800/api/v1/health`
   returns HTTP 200. It only reports configured integrations; it does not make
   live payment/SMS/email calls.
4. Run the frontend with the three environment variables above. Sign up a
   participant, then confirm the `profiles` row and a pending `registrations`
   row in Supabase. Test a newsletter signup and confirm a
   `newsletter_subscribers` row.
5. For protected backend routes, sign in in the frontend, retrieve the
   Supabase session `access_token`, and call a route with
   `Authorization: Bearer <access_token>`. Promote the matching profile's role
   to `admin` (or `hq_admin`) only in the development database before testing
   `/api/v1/admin/*`.

## No more controller mock data

`activityController` now returns database results, a 404 for a missing item,
or a 500 for database failure. `communicationController` now reads only the
persisted `communication_templates` table. The former empty-result database
proxy has also been removed, so a direct PostgreSQL consumer fails visibly
when `DATABASE_URL` is missing.
