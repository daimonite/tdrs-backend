# Tour de Rotary Dar es Salaam 2026 — Backend Architecture Plan & Production Build Guide

Production-ready backend API and operational infrastructure for **Tour de Rotary Dar es Salaam 2026**, built with **Node.js, Express, PostgreSQL 16 (Supabase)**, supporting **PayMe Africa** mobile money (M-Pesa, Tigo Pesa, Airtel Money), **Textify Africa** automated SMS alerts, **Resend** transactional emails, **7-Day Inventory Reservation Engine**, **5-Role RBAC**, **Twibbon Social Frame Generator**, **Strava Fitness Sync**, and **Schedule C Post-Event Impact Monitoring**.

---

## 📑 Table of Contents
1. [Backend Architecture Plan](#-backend-architecture-plan)
   - [System Topology](#system-topology)
   - [Database Schema & Entity Relationships](#database-schema--entity-relationships)
   - [5-Role RBAC Authorization Architecture](#5-role-rbac-authorization-architecture)
   - [Core Engine Specifications](#core-engine-specifications)
   - [Schedule A Platform Delivery Scope (A1 - A11)](#schedule-a-platform-delivery-scope-a1---a11)
   - [Schedule C Post-Event Impact & M&E Alignment](#schedule-c-post-event-impact--me-alignment)
2. [Production Build & Setup Guide](#-production-build--setup-guide)
   - [Prerequisites](#prerequisites)
   - [Environment Configuration](#environment-configuration)
   - [Database Migrations & Seeding](#database-migrations--seeding)
   - [Local Development Setup](#local-development-setup)
   - [Production Launch](#production-launch)
   - [Docker & Containerized Deployment](#docker--containerized-deployment)
   - [Production Nginx Reverse Proxy Setup](#production-nginx-reverse-proxy-setup)
3. [Complete REST API Reference](#-complete-rest-api-reference)
4. [Verification, Health & Monitoring](#-verification-health--monitoring)

---

## 🏛️ Backend Architecture Plan

### System Topology

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATIONS (FRONTEND)                       │
│  • Public Web & Mobile Portal       • Participant Account & Ticket Pass        │
│  • Volunteer Gate Scanner PWA       • Sponsor & Partner Portals                │
│  • HQ Admin Command Centre          • Public Finisher Certificate Verification │
└───────────────────────────────────────┬────────────────────────────────────────┘
                                        │ HTTPS / JSON API (Port 8800)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS API GATEWAY & APPLICATION SERVER                 │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Helmet • CORS • BodyParser • RBAC Auth • Error Handler       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ 16 Modular Controller Suites:                                            │  │
│  │ • activityController      • cartController          • merchandiseCtrl   │  │
│  │ • paymentController       • ticketController        • participantCtrl   │  │
│  │ • volunteerController     • sponsorController       • partnerCtrl       │  │
│  │ • collectibleController   • socialController        • campaignCtrl      │  │
│  │ • communicationController • evaluationController    • adminCtrl         │  │
│  │ • fitnessController                                                      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │ Core Engines & Background Workers:                                       │  │
│  │ • 7-Day Merchandise Reservation Auto-Release Cron (10-min cycle)        │  │
│  │ • PayMe Africa Idempotent Webhook & Payment Ledger Worker                │  │
│  │ • Cryptographic Gate QR Pass & Check-In Verification Engine              │  │
│  │ • Schedule C Impact Monitoring & NPS Calculation Engine                  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────────┬──────────────────────┬──────────┘
               │                               │                      │
               ▼                               ▼                      ▼
┌──────────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────┐
│   SUPABASE / POSTGRESQL 16   │ │   EXTERNAL GATEWAYS       │ │ CACHE & QUEUES  │
│ • 18 Relational Tables       │ │ • PayMe Africa (M-Pesa,   │ │ • In-Memory /   │
│ • Foreign Keys & Triggers    │ │   Tigo Pesa, Airtel)      │ │   Redis         │
│ • Row-Level Security (RLS)   │ │ • Textify Africa (SMS)    │ │ • Idempotency   │
│ • Full Audit Trail Logging   │ │ • Resend (Transactional)  │ │   Ledger        │
│ • JSONB Metadata & Config    │ │ • Strava API (OAuth)      │ │ • Audit Stream  │
└──────────────────────────────┘ └───────────────────────────┘ └─────────────────┘
```

### Database Schema & Entity Relationships

The data layer uses **PostgreSQL 16 hosted on Supabase**, normalized across 18 core domain entities:

```
[event_editions] 1 ──< [activities] 1 ──< [tickets] >── 1 [profiles]
       │                                     │                │
       │                                     │                ├──< [volunteer_assignments]
       │                                     │                ├──< [sponsor_deliverables]
       │                                     │                └──< [partner_clearances]
       ▼                                     ▼
[product_catalog] 1 ──< [product_variants]   │
                               │             │
                               ▼             ▼
[orders] 1 ─────────< [order_items] ─────────┘
   │   │
   │   └──< [inventory_reservations] (7-day temporary stock lock)
   │
   └──< [payments] (idempotent PayMe payment ledger)
```

#### Core Entities Summary
1. **`event_editions`**: Reusable annual instances (e.g. 2026 edition) storing active phase (`pre_event`, `event_day`, `post_event`), countdown dates, target charity funds, and branding parameters.
2. **`activities`**: Event challenges (Cyclathon 60km, Marathon 21km, Walkathon 10km, Community Walk 5km, Zumba, Yoga) with route distances, early-bird vs. standard prices, flag-off times, and max capacity.
3. **`profiles`**: Multi-role user accounts mapped to Supabase Auth (`participant`, `volunteer`, `sponsor`, `partner`, `admin`) storing contact info, t-shirt size, emergency contacts, and fitness privacy preferences.
4. **`product_catalog` & `product_variants`**: Official Tour de Rotary jerseys, bib shorts, cycling caps, and water bottles categorized with SKU, size, color, stock on hand, and price.
5. **`orders` & `order_items`**: Unified cart orders accommodating both event tickets and physical merchandise, with delivery selection (`pickup` vs `delivery`) and payment status (`pending`, `paid`, `cancelled`, `refunded`).
6. **`inventory_reservations`**: Manages the 7-day apparel reservation window with automated expiration timestamps and status tracking (`active_hold`, `completed_paid`, `released_expired`).
7. **`payments`**: Tamper-proof transaction ledger with idempotency keys, mobile money provider reference, phone number, and timestamp.
8. **`tickets`**: Gate entry passes with unique BIB numbers (`CYC-2026-0104`), cryptographically secure QR verification tokens, check-in status, timestamps, and station names.
9. **`digital_collectibles`**: Finisher digital assets with serial numbers, finish times, tier badges, PDF download URLs, and public SHA-256 verification hashes for tamper-proof validation.
10. **`volunteer_assignments`**: Volunteer zones (Waterfront Arch, Askari Monument, Coco Beach), shifts, tasks, and coordinator contact details.
11. **`sponsor_deliverables`**: Corporate tier entitlements (Title Partner, Platinum, Gold, Silver), vector logo assets, campaign links, and VIP passes.
12. **`partner_clearances`**: Emergency medical dispatch points (Aga Khan Hospital, Red Cross), police motorcycle escort checkpoints, and municipal approvals.
13. **`communication_templates` & `audit_logs`**: System SMS and email templates with dynamic merge tags (`{{athlete_name}}`, `{{bib_number}}`) and full administrative audit logging.
14. **`promo_codes` & `participant_wishlist`**: Marketing discount codes with usage limits, expiration dates, and athlete merchandise wishlists.
15. **`evaluation_surveys`**: Post-event Schedule C monitoring intake measuring NPS scores, route safety ratings, hydration satisfaction, and qualitative feedback.

---

### 5-Role RBAC Authorization Architecture

Access control is strictly enforced via header authentication (`x-user-role`, `x-user-email`) and JWT authorization tokens in `middleware/rbac.js`:

| Role | Scope & Permissions | Accessible Route Namespaces |
|:---|:---|:---|
| **`admin`** | Full super-administrative access to financials, user roles, inventory overrides, promo codes, refunds, campaign configuration, and audit trails. | `/api/v1/admin/*`, `/api/v1/communications/*`, and all public routes |
| **`volunteer`** | Operational race-day access: view station assignments, emergency contacts, shift briefings, and execute ticket QR check-ins at entry gates. | `/api/v1/volunteer/*`, `/api/v1/tickets/checkin`, public routes |
| **`sponsor`** | Corporate partner access: manage brand activation banners, upload vector logos, review package deliverables, and download ROI reports. | `/api/v1/sponsor/*`, public routes |
| **`partner`** | Inter-agency operational access: review traffic police road-closure permits, ambulance and paramedic stationing, and submit clearance briefs. | `/api/v1/partner/*`, public routes |
| **`participant`** | Athlete self-service: update profile & medical contacts, view purchased tickets, generate gate passes, track training, and download finisher certificates. | `/api/v1/participant/*`, `/api/v1/cart/*`, `/api/v1/collectibles/*` |

---

### Core Engine Specifications

#### 1. 7-Day Merchandise Reservation & Stock Release Engine
* **Day 0 (Checkout)**: Athlete creates an order containing reserved merchandise. Stock is deducted from available inventory, and an active hold is registered with `expires_at = NOW() + 7 days`.
* **Day 4 (First Reminder)**: Automated cron identifies unpaid orders at 3 days remaining and dispatches an alert SMS via Textify Africa.
* **Day 6 (Urgent Warning)**: Cron sends an urgent 24-hour final expiration warning SMS before release.
* **Day 7 (Auto-Release Worker)**: Unpaid reservations are transitioned to `released_expired`, the reserved stock is restored back into `product_variants.stock_quantity`, and the order is marked `cancelled`.

#### 2. PayMe Africa Mobile Money Integration & Idempotent Webhook
* **USSD Push**: `POST /api/v1/payments/initiate` sends a real-time prompt to the participant's mobile phone (M-Pesa, Tigo Pesa, Airtel Money).
* **HMAC-SHA256 Verification**: Incoming webhook payloads are validated against `PAYME_WEBHOOK_SECRET`.
* **Idempotency Guard**: Webhooks verify incoming `idempotency_key` against the `payments` table. Duplicate webhook deliveries return the existing processed record without double-charging or re-issuing duplicate tickets.
* **Instant Ticket Generation**: Once marked `paid`, the engine automatically issues unique BIB passes, generates 32-character QR tokens, and dispatches confirmation SMS alerts.

#### 3. Cryptographic Gate QR Check-In Engine
* Every ticket is assigned a cryptographically generated verification token (`qr_verification_token`).
* Race marshals scan tokens using `/api/v1/tickets/checkin`.
* The system enforces strict single-use validation: already checked-in tickets return a `409 Conflict` containing the exact timestamp and station where the ticket was already scanned.

#### 4. Schedule C Post-Event Impact Monitoring & Survey Engine
* Collects anonymous and authenticated athlete evaluations with ratings for route safety, hydration, merchandise quality, and overall Net Promoter Score (NPS).
* Aggregates live charity fund metrics dedicated to Rotary maternal and neonatal health initiatives across Tanzanian regional hospitals (Amana Regional Hospital Maternity Ward, Kawe Health Centre, Kigamboni Health Post).

---

### Schedule A Platform Delivery Scope (A1 - A11)

| Section | Scope of Work (Schedule A) | Backend Endpoints & Implementation | Database Tables |
|:---|:---|:---|:---|
| **A1. Public Experience** | Landing content, event countdown, activity catalog, pricing tiers, and active edition switcher | `GET /api/v1/campaigns/landing`<br/>`GET /api/v1/activities`<br/>`GET /api/v1/activities/:id` | `event_editions`<br/>`activities`<br/>`campaigns` |
| **A2. Participant Portal** | Profile, tickets, order history, training progress, merchandise wishlist, order tracking, and preferences | `GET /api/v1/participant/profile`<br/>`GET /api/v1/participant/orders`<br/>`GET /api/v1/participant/tickets`<br/>`GET /api/v1/participant/training`<br/>`GET /api/v1/participant/wishlist` | `profiles`<br/>`tickets`<br/>`orders`<br/>`participant_wishlist` |
| **A3. Volunteer Portal** | Assigned station, shift times, briefing notices, and mobile gate QR barcode ticket scanner | `GET /api/v1/volunteer/shift`<br/>`GET /api/v1/volunteer/notices`<br/>`POST /api/v1/volunteer/checkin-ticket` | `volunteer_assignments`<br/>`profiles`<br/>`tickets` |
| **A4. Sponsor Portal** | Sponsor tier deliverables, contract entitlements, vector logo asset repository, and lead tracking | `GET /api/v1/sponsor/portal`<br/>`GET /api/v1/sponsor/assets` | `sponsor_deliverables`<br/>`profiles` |
| **A5. Partner Portal** | Inter-agency coordination: Aga Khan hospital emergency routing, police motorcycle escorts, and permits | `GET /api/v1/partner/clearances`<br/>`POST /api/v1/partner/submissions` | `partner_clearances`<br/>`audit_logs` |
| **A6. HQ Admin Command** | Executive oversight: orders, inventory release, promo codes, capacity overrides, refunds, and audit trail | `GET /api/v1/admin/overview`<br/>`GET /api/v1/admin/orders`<br/>`GET /api/v1/admin/inventory`<br/>`POST /api/v1/admin/refunds/:id/process` | `orders`<br/>`product_variants`<br/>`audit_logs` |
| **A7. Payments & Commerce** | PayMe Africa mobile checkout, 7-day reservation locking, pickup vs shipping, and payment status retry | `POST /api/v1/cart/checkout`<br/>`POST /api/v1/payments/initiate`<br/>`POST /api/v1/payments/payme/webhook` | `orders`<br/>`inventory_reservations`<br/>`payments` |
| **A8. Digital Collectibles** | Verified finisher certificates, public QR hash verification, downloadable PDF links, and social twibbons | `GET /api/v1/collectibles/verify/:hash`<br/>`GET /api/v1/social/twibbon/frames`<br/>`POST /api/v1/social/twibbon/generate` | `digital_collectibles`<br/>`social_shares` |
| **A9. Communications** | Automated SMS and email templates, dynamic variable rendering, scheduled delivery, and broadcast logs | `GET /api/v1/communications/templates`<br/>`POST /api/v1/communications/preview`<br/>`POST /api/v1/communications/send-test` | `communication_templates`<br/>`audit_logs` |
| **A10. Release Priorities** | Priority 1: Registration, payments, participant & admin portals.<br/>Priority 2: Merchandise, collectibles, volunteer/sponsor tools.<br/>Priority 3: Third-party automated syncs | Unified controller routing with modular fallback and health observability at `GET /api/v1/health` | Complete DB Suite |
| **A11. Dependency Grace** | Zero-crash guarantee: graceful degradation if third-party credentials (PayMe, Textify, Strava) are absent | Real HTTP clients with clean configuration checks and descriptive responses | All Services |

---

### Schedule C Post-Event Impact & M&E Alignment

| Scope Item (Schedule C) | Endpoint | Description |
|:---|:---|:---|
| **Impact Reporting & Fund Tracking** | `GET /api/v1/evaluation/impact-report` | Aggregates verified finishers, total funds raised in TSh, and allocations to maternal & neonatal hospital equipment. |
| **Post-Event Survey Intake** | `POST /api/v1/evaluation/survey` | Collects NPS ratings, route safety scores, hydration feedback, and suggestions from participants. |
| **Analytical Survey Results** | `GET /api/v1/evaluation/results` | Computes average satisfaction rates, category ratings, and qualitative feedback for committee reporting. |

---

## 🛠️ Production Build & Setup Guide

### Prerequisites
* **Node.js**: v18.16.0 or higher
* **npm**: v9.0.0 or higher
* **PostgreSQL**: v16 (Managed on Supabase or standalone PostgreSQL instance)
* **Docker & Docker Compose**: (Optional, for containerized deployment)

---

### Environment Configuration

Create `.env` by copying `.env.example`:
```bash
cp .env.example .env
```

#### Environment Variables Reference
```env
# ==============================================================================
# TOUR DE ROTARY DSM 2026 - PRODUCTION ENVIRONMENT CONFIGURATION
# ==============================================================================

# --- Server & Runtime ---
PORT=8800
NODE_ENV=production
APP_URL=https://api.tourderotary.co.tz

# --- Supabase / PostgreSQL 16 Database ---
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key

# --- PayMe Africa (M-Pesa, Tigo Pesa, Airtel Money) ---
PAYME_API_KEY=your_payme_africa_live_api_key
PAYME_WEBHOOK_SECRET=your_payme_webhook_hmac_sha256_secret
PAYME_API_URL=https://api.payme.africa/v1
PAYME_MERCHANT_CODE=ROTARY_DSM_2026
PAYME_DEFAULT_CURRENCY=TZS

# --- Textify Africa (SMS Automation & Race Alerts) ---
TEXTIFY_API_KEY=your_textify_africa_api_key
TEXTIFY_SENDER_ID=ROTARY-DSM
TEXTIFY_API_URL=https://api.textify.africa/v1/sms/send

# --- Resend (Transactional Email Service) ---
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM="Tour de Rotary DSM <tickets@tourderotary.co.tz>"

# --- Strava API (Athlete Fitness Training Sync) ---
STRAVA_CLIENT_ID=your_strava_app_client_id
STRAVA_CLIENT_SECRET=your_strava_app_client_secret

# --- JWT Secret for RBAC Auth ---
JWT_SECRET=your_super_secure_jwt_signing_secret_key_2026
```

---

### Database Migrations & Seeding

Execute the SQL scripts in order using the **Supabase SQL Editor** or via command-line `psql`:

```bash
# 1. Apply Core Schema (Editions, Activities, Profiles, Catalog, Orders, Tickets, Payments)
psql -d "$DATABASE_URL" -f migrations/001_tour_de_rotary_schema.sql

# 2. Apply Extended Tables (Campaigns, Templates, Social Shares, Survey Intake, Audit Logs)
psql -d "$DATABASE_URL" -f migrations/002_extended_scope_tables.sql

# 3. Apply Promo Codes, Wishlists & Refunds Schema
psql -d "$DATABASE_URL" -f migrations/003_promo_wishlist_refunds.sql

# 4. Populate 2026 Edition Seed Data & System Templates
psql -d "$DATABASE_URL" -f seeds/001_seed_rotary_2026.sql
```

---

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Verify all Javascript syntax
npm run lint

# 3. Launch with auto-reload (using nodemon)
npm run dev
```

The API will bind to `http://localhost:8800`.
Test connectivity:
```bash
curl http://localhost:8800/api/v1/health
```

---

### Production Launch

For bare-metal or virtual machine (Ubuntu/Debian) production deployment:

```bash
# 1. Install production dependencies only
npm ci --only=production

# 2. Run syntax check
node --check index.js

# 3. Start standard Node server
npm start

# OR manage with PM2 Process Manager for clustering & auto-restart:
npm install -g pm2
pm2 start index.js --name "tourderotary-api" -i max
pm2 save
pm2 startup
```

---

### Docker & Containerized Deployment

A production-ready `Dockerfile` and `docker-compose.yml` are included:

#### 1. Build and Run with Docker Compose
```bash
docker-compose up -d --build
```

#### 2. Check Container Logs
```bash
docker-compose logs -f app
```

#### 3. Stop Container
```bash
docker-compose down
```

---

### Production Nginx Reverse Proxy Setup

Place the following configuration in `/etc/nginx/sites-available/api.tourderotary.co.tz`:

```nginx
server {
    listen 80;
    server_name api.tourderotary.co.tz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.tourderotary.co.tz;

    ssl_certificate /etc/letsencrypt/live/api.tourderotary.co.tz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tourderotary.co.tz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8800;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 15M;
    }
}
```

---

## 📡 Complete REST API Reference

### 1. Public & Activities
- `GET /api/v1/activities` — List 2026 activities with pricing and remaining capacity.
- `GET /api/v1/activities/:id` — Activity details, start times, route distances, and GPX coordinates.

### 2. Cart, Checkout & Reservations
- `POST /api/v1/cart/checkout` — Create order, reserve inventory, and lock 7-day apparel window.
- `GET /api/v1/merchandise` — List official cycling jerseys, bib shorts, and gear.
- `GET /api/v1/merchandise/:id` — Product sizing and inventory variants.

### 3. Payments & Webhooks (PayMe Africa)
- `POST /api/v1/payments/initiate` — Trigger USSD push for M-Pesa, Tigo Pesa, or Airtel Money.
- `POST /api/v1/payments/payme/webhook` — Process HMAC-signed payment callback, complete reservation, issue tickets.
- `GET /api/v1/payments/status/:order_number` — Query order payment status.
- `POST /api/v1/payments/retry` — Re-initiate payment push for unpaid orders.

### 4. Tickets & Gate Verification
- `GET /api/v1/tickets` — Query tickets for authenticated user (`x-user-email`).
- `GET /api/v1/tickets/qr/:qr_token` — Query ticket validity by QR verification token.
- `POST /api/v1/tickets/checkin` — Race marshal gate scanner endpoint. Validates token and marks checked-in.

### 5. Participant Self-Service Portal
- `GET /api/v1/participant/profile` — Participant details, medical contacts, registered activities count.
- `PUT /api/v1/participant/profile` — Update emergency contact and t-shirt size.
- `GET /api/v1/participant/orders` — Order history and payment status.
- `GET /api/v1/participant/tickets` — Issued QR passes.
- `GET /api/v1/participant/training` — Weekly training distance & Strava sync status.
- `GET /api/v1/participant/wishlist` — Saved merchandise.
- `POST /api/v1/participant/wishlist/toggle` — Add/remove merchandise from athlete wishlist.
- `GET /api/v1/participant/orders/:order_id/tracking` — Merchandise pickup station tracking.
- `POST /api/v1/participant/orders/:order_id/pickup` — Confirm expo merchandise collection.

### 6. Dedicated 5-Role Portals (RBAC)
- `GET /api/v1/volunteer/shift` — Assigned marshal station, shift hours, and coordinator contacts.
- `GET /api/v1/volunteer/notices` — HQ event briefings and route bulletins.
- `POST /api/v1/volunteer/checkin-ticket` — Gate scanner access for volunteer marshals.
- `GET /api/v1/sponsor/portal` — Sponsor tier deliverables and activation overview.
- `GET /api/v1/sponsor/assets` — Sponsor vector logo upload and asset directory.
- `GET /api/v1/partner/clearances` — Emergency medical (hospital) routes and police motorcade clearances.
- `POST /api/v1/partner/submissions` — Partner operational documents submission.

### 7. HQ Admin Command Centre
- `GET /api/v1/admin/overview` — Executive KPIs: registrations, revenue, tickets issued, reservations.
- `GET /api/v1/admin/orders` — Manage orders and update delivery/payment states.
- `GET /api/v1/admin/inventory` — Monitor stock levels and active 7-day reservations.
- `POST /api/v1/admin/inventory/release-expired` — Manual trigger to release expired merchandise holds.
- `GET /api/v1/admin/promo-codes` — List active promotional discount codes.
- `POST /api/v1/admin/promo-codes` — Create promotional discount code with usage limits.
- `GET /api/v1/admin/refunds` — Query refund requests.
- `POST /api/v1/admin/refunds/:id/process` — Process refund and restore ticket/stock allocations.
- `GET /api/v1/admin/audit-logs` — Administrative security audit trail.

### 8. Digital Collectibles & Social Assets
- `GET /api/v1/collectibles/mine` — Athlete finisher certificates and badges.
- `GET /api/v1/collectibles/verify/:hash` — Tamper-proof public verification by SHA-256 hash.
- `GET /api/v1/social/twibbon/frames` — Available social frame overlays.
- `POST /api/v1/social/twibbon/generate` — Generate custom Twibbon badge.
- `GET /api/v1/social/og/:bib` — Open Graph share banner for social media.

### 9. Communications Engine
- `GET /api/v1/communications/templates` — SMS and email notification templates.
- `POST /api/v1/communications/preview` — Render template with sample merge tags.
- `POST /api/v1/communications/send-test` — Dispatch live SMS/email test message.
- `GET /api/v1/communications/logs` — Outgoing communication dispatch history.

### 10. Schedule C Post-Event Impact & Evaluation
- `POST /api/v1/evaluation/survey` — Submit athlete post-event evaluation and NPS score.
- `GET /api/v1/evaluation/results` — Analytical breakdown of survey feedback and ratings.
- `GET /api/v1/evaluation/impact-report` — Schedule C maternal health charity impact metrics.

---

## 🔍 Verification, Health & Monitoring

To check server health and live integration readiness:
```bash
curl -X GET https://api.tourderotary.co.tz/api/v1/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "environment": "production",
  "database": "Supabase PostgreSQL 16",
  "edition": "Tour de Rotary DSM 2026",
  "integrations": {
    "payme_africa": "READY",
    "textify_sms": "READY",
    "resend_email": "READY",
    "strava_sync": "READY",
    "polygon_certificates": "READY"
  }
}
```
