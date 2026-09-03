import { SqlTableDefinition } from '../types';

export const SQL_TABLES: SqlTableDefinition[] = [
  {
    name: 'events & event_editions',
    category: 'Events & Content',
    description: 'Manages annual reusable event instances, current phase (pre_event, event_day, post_event), countdowns, and branding settings.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Unique edition ID (e.g. 2026 edition)' },
      { name: 'slug', type: 'VARCHAR(100)', description: 'URL slug (e.g., "tour-de-rotary-dsm-2026")' },
      { name: 'year', type: 'INTEGER', description: 'Event calendar year (2026)' },
      { name: 'current_phase', type: 'VARCHAR(30)', description: '"pre_event" | "event_day" | "post_event"' },
      { name: 'event_date', type: 'TIMESTAMPTZ', description: 'Official event date: 2026-11-01 06:00:00+03' },
      { name: 'pre_event_start', type: 'TIMESTAMPTZ', description: 'Phase 1 go-live timestamp' },
      { name: 'post_event_start', type: 'TIMESTAMPTZ', description: 'Phase 3 archive/M&E start timestamp' },
      { name: 'config_json', type: 'JSONB', description: 'Banner URLs, charity impact metrics, target fundraising in TSh' },
      { name: 'is_active', type: 'BOOLEAN', description: 'Whether this edition is accepting registrations' }
    ],
    rlsPolicies: [
      'SELECT is public for active editions',
      'INSERT/UPDATE/DELETE restricted to role = "admin"'
    ],
    sqlCode: `-- 1. Events & Editions Table
CREATE TABLE IF NOT EXISTS event_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  year INTEGER NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL DEFAULT 'Tour de Rotary DSM',
  current_phase VARCHAR(30) NOT NULL DEFAULT 'pre_event' 
    CHECK (current_phase IN ('pre_event', 'event_day', 'post_event')),
  event_date TIMESTAMPTZ NOT NULL,
  pre_event_start TIMESTAMPTZ NOT NULL,
  post_event_start TIMESTAMPTZ NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on slug & active status
CREATE INDEX idx_event_editions_slug ON event_editions(slug);
CREATE INDEX idx_event_editions_active ON event_editions(is_active);`
  },
  {
    name: 'activities',
    category: 'Events & Content',
    description: 'Defines the 6 official activities (Cyclathon, Marathon, Walkathon, Zumba, Yoga, Community Walk) with routes, capacity, and pricing.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Activity ID' },
      { name: 'edition_id', type: 'UUID', isForeign: true, description: 'Links to event_editions' },
      { name: 'title', type: 'VARCHAR(150)', description: 'e.g., "Cyclathon 60km Pro", "Zumba Fiesta"' },
      { name: 'type', type: 'VARCHAR(50)', description: 'Cyclathon | Marathon | Walkathon | Zumba | Yoga | Community Walk' },
      { name: 'distance_km', type: 'DECIMAL(6,2)', description: 'Route distance in kilometers' },
      { name: 'route_geojson', type: 'JSONB', description: 'GPS coordinates for interactive route map' },
      { name: 'early_bird_price_tsh', type: 'DECIMAL(12,2)', description: 'Early-bird ticket price in TSh' },
      { name: 'standard_price_tsh', type: 'DECIMAL(12,2)', description: 'Regular ticket price in TSh' },
      { name: 'capacity', type: 'INTEGER', description: 'Max participants allowed' },
      { name: 'registered_count', type: 'INTEGER', description: 'Currently registered participants count' },
      { name: 'early_bird_deadline', type: 'TIMESTAMPTZ', description: 'When early-bird pricing ends' }
    ],
    sqlCode: `-- 2. Activities Table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id UUID REFERENCES event_editions(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,
  distance_km DECIMAL(6, 2) DEFAULT 0.00,
  route_geojson JSONB DEFAULT '{}'::jsonb,
  early_bird_price_tsh DECIMAL(12, 2) NOT NULL DEFAULT 35000.00,
  standard_price_tsh DECIMAL(12, 2) NOT NULL DEFAULT 50000.00,
  capacity INTEGER NOT NULL DEFAULT 500,
  registered_count INTEGER NOT NULL DEFAULT 0,
  early_bird_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: Registered count cannot exceed capacity
ALTER TABLE activities ADD CONSTRAINT chk_activity_capacity 
  CHECK (registered_count <= capacity);`
  },
  {
    name: 'profiles & auth_roles',
    category: 'Users & Auth',
    description: 'Participant and stakeholder user profiles mapped to Supabase Auth UUID, storing 5 RBAC roles and medical/emergency contacts.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Supabase auth.users UUID' },
      { name: 'email', type: 'VARCHAR(255)', description: 'User verified email' },
      { name: 'phone_number', type: 'VARCHAR(30)', description: 'Tanzanian phone number (e.g. +255712345678)' },
      { name: 'full_name', type: 'VARCHAR(255)', description: 'Participant full legal name' },
      { name: 'role', type: 'VARCHAR(30)', description: '"participant" | "volunteer" | "sponsor" | "partner" | "admin"' },
      { name: 'tshirt_size', type: 'VARCHAR(10)', description: '"XS" | "S" | "M" | "L" | "XL" | "2XL"' },
      { name: 'emergency_contact', type: 'JSONB', description: '{ name, phone, relationship }' },
      { name: 'referral_code', type: 'VARCHAR(20)', description: 'Unique personal invite code (e.g., "ROTARY-KIM")' },
      { name: 'fitness_sharing_opt_in', type: 'BOOLEAN', description: 'Whether community leaderboard can show badges' }
    ],
    sqlCode: `-- 3. Profiles & 5 RBAC Portals Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(30) UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant', 'volunteer', 'sponsor', 'partner', 'admin')),
  tshirt_size VARCHAR(10) DEFAULT 'L',
  emergency_contact JSONB DEFAULT '{"name":"","phone":"","relationship":""}'::jsonb,
  referral_code VARCHAR(20) UNIQUE,
  referred_by_code VARCHAR(20),
  fitness_sharing_opt_in BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can view & update own profile, Admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);`
  },
  {
    name: 'orders & order_items',
    category: 'Ticketing & Orders',
    description: 'Unified Mixed Cart engine handling simultaneous ticket purchases, physical merchandise, promo codes, and TSh monetary totals.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Order ID' },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'Buyer profile ID' },
      { name: 'order_number', type: 'VARCHAR(50)', description: 'Human-friendly ID: "TDR-2026-89412"' },
      { name: 'status', type: 'VARCHAR(30)', description: '"pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded"' },
      { name: 'subtotal_tsh', type: 'DECIMAL(12,2)', description: 'Subtotal before promo' },
      { name: 'discount_tsh', type: 'DECIMAL(12,2)', description: 'Promo code discount' },
      { name: 'total_tsh', type: 'DECIMAL(12,2)', description: 'Final payable TSh amount' },
      { name: 'promo_code', type: 'VARCHAR(50)', description: 'Applied voucher / corporate code' },
      { name: 'payment_recovery_url', type: 'TEXT', description: 'Magic link to resume failed payment' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Order initiation timestamp' }
    ],
    sqlCode: `-- 4. Mixed Cart Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')),
  subtotal_tsh DECIMAL(12, 2) NOT NULL CHECK (subtotal_tsh >= 0),
  discount_tsh DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_tsh DECIMAL(12, 2) NOT NULL CHECK (total_tsh >= 0),
  promo_code VARCHAR(50),
  payment_recovery_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items (Mixed: Ticket vs Merchandise)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ticket', 'merchandise', 'collectible')),
  activity_id UUID REFERENCES activities(id),
  product_variant_id UUID, -- Links to product_variants
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_tsh DECIMAL(12, 2) NOT NULL CHECK (unit_price_tsh >= 0),
  line_total_tsh DECIMAL(12, 2) NOT NULL CHECK (line_total_tsh >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);`
  },
  {
    name: 'merch_inventory & reservations',
    category: 'Inventory & Merch',
    description: 'Physical apparel store with 7-day stock reservation locking, Day 4/6 SMS warnings, and automatic inventory release on Day 7.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Reservation ID' },
      { name: 'product_variant_id', type: 'UUID', isForeign: true, description: 'Target size/color variant' },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'Participant who reserved' },
      { name: 'quantity', type: 'INTEGER', description: 'Reserved quantity' },
      { name: 'reserved_at', type: 'TIMESTAMPTZ', description: 'Day 0 reservation start' },
      { name: 'expires_at', type: 'TIMESTAMPTZ', description: 'Day 7 hard deadline (auto-release)' },
      { name: 'day4_reminded', type: 'BOOLEAN', description: 'Day 4 SMS reminder sent' },
      { name: 'day6_reminded', type: 'BOOLEAN', description: 'Day 6 final SMS warning sent' },
      { name: 'status', type: 'VARCHAR(20)', description: '"active" | "paid_completed" | "expired_released"' }
    ],
    sqlCode: `-- 5. Products & Inventory Reservations with 7-Day Expiry Engine
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'apparel',
  price_tsh DECIMAL(12, 2) NOT NULL CHECK (price_tsh > 0),
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(10) NOT NULL,
  color VARCHAR(50) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- NOW() + INTERVAL '7 days'
  day4_reminded BOOLEAN DEFAULT false,
  day6_reminded BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'paid_completed', 'expired_released'))
);`
  },
  {
    name: 'payments (PayMe Africa)',
    category: 'Ticketing & Orders',
    description: 'PayMe Africa webhook ledger with Idempotency Key validation, HMAC signature checks, and multi-network mobile money reconciliation.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Payment record ID' },
      { name: 'order_id', type: 'UUID', isForeign: true, description: 'Order ID' },
      { name: 'idempotency_key', type: 'VARCHAR(100)', description: 'UUID passed to PayMe to prevent duplicate charges' },
      { name: 'payme_reference', type: 'VARCHAR(150)', description: 'External PayMe Africa Transaction Reference' },
      { name: 'provider_channel', type: 'VARCHAR(50)', description: '"M-Pesa" | "Tigo Pesa" | "Airtel Money" | "Card"' },
      { name: 'amount_tsh', type: 'DECIMAL(12,2)', description: 'Paid amount' },
      { name: 'status', type: 'VARCHAR(30)', description: '"pending" | "success" | "failed" | "refunded"' },
      { name: 'webhook_payload', type: 'JSONB', description: 'Raw callback payload for audit log' },
      { name: 'paid_at', type: 'TIMESTAMPTZ', description: 'Payment settlement timestamp' }
    ],
    sqlCode: `-- 6. PayMe Africa Payments Table with Idempotency
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(100) UNIQUE NOT NULL,
  payme_reference VARCHAR(150) UNIQUE,
  provider_channel VARCHAR(50),
  amount_tsh DECIMAL(12, 2) NOT NULL CHECK (amount_tsh > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  webhook_payload JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance index for rapid webhook lookups
CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
CREATE INDEX idx_payments_payme_ref ON payments(payme_reference);`
  },
  {
    name: 'tickets & registrations',
    category: 'Ticketing & Orders',
    description: 'Generates secure cryptographic QR check-in codes, BIB assignment numbers, and participation check-in audit timestamps on Event Day.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Ticket ID' },
      { name: 'order_id', type: 'UUID', isForeign: true, description: 'Parent paid order' },
      { name: 'activity_id', type: 'UUID', isForeign: true, description: 'Registered activity' },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'Participant profile' },
      { name: 'bib_number', type: 'VARCHAR(30)', description: 'Assigned bib number (e.g. "CYC-2026-042")' },
      { name: 'qr_verification_token', type: 'VARCHAR(128)', description: 'Cryptographic SHA-256 token for QR scan' },
      { name: 'checked_in', type: 'BOOLEAN', description: 'True when scanned at gate' },
      { name: 'checked_in_at', type: 'TIMESTAMPTZ', description: 'Check-in timestamp' },
      { name: 'checked_in_by_volunteer_id', type: 'UUID', description: 'Volunteer who scanned the QR code' }
    ],
    sqlCode: `-- 7. Tickets & Event Day QR Pass
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bib_number VARCHAR(30) UNIQUE,
  qr_verification_token VARCHAR(128) UNIQUE NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  checked_in_by_volunteer_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_qr_token ON tickets(qr_verification_token);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);`
  },
  {
    name: 'digital_collectibles & nfts',
    category: 'Training & Collectibles',
    description: 'Generates verifiable proof-of-participation certificates, high-res PDF downloads, public verification hashes, and optional on-chain NFT drops.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Collectible ID' },
      { name: 'user_id', type: 'UUID', isForeign: true, description: 'Participant profile' },
      { name: 'edition_id', type: 'UUID', isForeign: true, description: 'Event edition' },
      { name: 'serial_number', type: 'VARCHAR(50)', description: 'e.g. "TDR-2026-FINISHER-0082"' },
      { name: 'tier', type: 'VARCHAR(50)', description: '"Finisher" | "Patron" | "Sponsor Edition" | "Top Fundraiser"' },
      { name: 'public_verification_hash', type: 'VARCHAR(64)', description: 'Unique hash for /verify/:hash page' },
      { name: 'certificate_pdf_url', type: 'TEXT', description: 'High-res certificate file in Supabase Storage' },
      { name: 'on_chain_tx_hash', type: 'VARCHAR(128)', description: 'Optional Polygon/L2 blockchain tx hash' },
      { name: 'issued_at', type: 'TIMESTAMPTZ', description: 'Issuance date' }
    ],
    sqlCode: `-- 8. Digital Collectibles & Public QR Verification
CREATE TABLE IF NOT EXISTS digital_collectibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  edition_id UUID REFERENCES event_editions(id) ON DELETE CASCADE,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'Finisher',
  public_verification_hash VARCHAR(64) UNIQUE NOT NULL,
  certificate_pdf_url TEXT,
  image_preview_url TEXT,
  metadata_json JSONB DEFAULT '{}'::jsonb,
  on_chain_tx_hash VARCHAR(128),
  is_minted_on_chain BOOLEAN DEFAULT false,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collectibles_hash ON digital_collectibles(public_verification_hash);`
  },
  {
    name: 'communication_queue',
    category: 'Communications & Operations',
    description: 'Asynchronous SMS (Textify Africa) and Email (Resend) queue for reservation warnings, receipts, event briefings, and broadcast alerts.',
    columns: [
      { name: 'id', type: 'UUID', isPrimary: true, description: 'Queue ID' },
      { name: 'channel', type: 'VARCHAR(20)', description: '"SMS" | "EMAIL"' },
      { name: 'provider', type: 'VARCHAR(30)', description: '"TextifyAfrica" | "Resend"' },
      { name: 'recipient', type: 'VARCHAR(255)', description: 'Phone number or Email address' },
      { name: 'template_id', type: 'VARCHAR(50)', description: '"RESERVATION_DAY4_SMS" | "TICKET_RECEIPT_EMAIL"' },
      { name: 'payload_json', type: 'JSONB', description: 'Template variables' },
      { name: 'status', type: 'VARCHAR(20)', description: '"queued" | "sending" | "delivered" | "failed"' },
      { name: 'scheduled_for', type: 'TIMESTAMPTZ', description: 'When message should be dispatched' },
      { name: 'retry_count', type: 'INTEGER', description: 'Retries attempted (max 3)' }
    ],
    sqlCode: `-- 9. Automated Communication Queue (Textify Africa & Resend)
CREATE TABLE IF NOT EXISTS communication_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('SMS', 'EMAIL')),
  provider VARCHAR(30) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  template_id VARCHAR(50) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sending', 'delivered', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retry_count INTEGER NOT NULL DEFAULT 0,
  provider_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX idx_comm_queue_status_sched ON communication_queue(status, scheduled_for);`
  }
];

export const ARCHITECTURE_LAYERS = [
  {
    layer: 1,
    title: 'Client Interfaces & 5 Role Portals',
    tech: 'React / Next.js on Vercel',
    description: 'Mobile-first client apps connecting to the backend via REST and Supabase Client. Portals: Participant, Volunteer, Sponsor, Partner, and HQ Admin Command Centre.',
    badges: ['Portals x5', 'Mobile-First', 'Next.js App Router']
  },
  {
    layer: 2,
    title: 'API Gateway & 5-Role RBAC Authorization',
    tech: 'Supabase Edge Functions / Express v5',
    description: 'Enforces JWT validation, role-based authorization, rate-limiting, and parses incoming request payloads with strict Zod/Joi schemas.',
    badges: ['JWT Verification', 'RBAC Middleware', 'Rate Limiting']
  },
  {
    layer: 3,
    title: 'Phase Engine & Event Lifecycle State Machine',
    tech: 'Phase Engine Service',
    description: 'Automatically transitions platform behavior between Pre-Event (registrations/merch), Event-Day (live check-ins/briefings), and Post-Event (M&E, galleries, collectibles).',
    badges: ['Pre-Event', 'Event-Day', 'Post-Event M&E']
  },
  {
    layer: 4,
    title: 'Mixed Cart & 7-Day Inventory Reservation Worker',
    tech: 'PostgreSQL Transactions + Cron Worker',
    description: 'Combines tickets + merch into single TSh totals. Locks reserved apparel for 7 days; auto-schedules Day 4 & Day 6 SMS, releasing unpaid stock on Day 7.',
    badges: ['ACID Locking', '7-Day Expiry Engine', 'Mixed Cart']
  },
  {
    layer: 5,
    title: 'External Integration Connectors',
    tech: 'PayMe Africa • Textify Africa • Resend • Strava',
    description: 'Executes payments with Idempotency Key validation, dispatches automated SMS/Emails with backoff retries, and synchronizes fitness training distance.',
    badges: ['PayMe Africa (Idempotent)', 'Textify Africa SMS', 'Resend Email', 'Strava OAuth']
  },
  {
    layer: 6,
    title: 'Digital Collectible & NFT Provider Layer',
    tech: 'Certificate Engine + Provider-Agnostic NFT Hub',
    description: 'Generates high-res PDF participation certificates with public QR verification hashes. Supports optional Polygon/L2 minting for patron badges.',
    badges: ['QR Verification', 'PDF Generator', 'Optional Web3 Minting']
  },
  {
    layer: 7,
    title: 'Relational Database & Storage (PostgreSQL)',
    tech: 'Supabase PostgreSQL + Row Level Security (RLS)',
    description: 'Permanent ACID storage with strict Row Level Security policies, indexes for sub-10ms queries, audit logs, and secure media buckets for certificates & receipts.',
    badges: ['PostgreSQL 16', 'Row Level Security', 'Encrypted Backups']
  }
];
