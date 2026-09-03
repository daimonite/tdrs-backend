import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  Users, 
  CreditCard, 
  Smartphone, 
  Award, 
  FileText, 
  Settings, 
  Layers, 
  Database, 
  Send, 
  Share2, 
  Tag, 
  RotateCcw, 
  AlertTriangle, 
  HeartHandshake, 
  Building2, 
  Compass, 
  Check, 
  Search, 
  Filter,
  Eye,
  ShoppingBag,
  Zap,
  ChevronRight
} from 'lucide-react';

type SectionFilter = 'all' | 'public_participant' | 'ops_portals' | 'commerce_comms' | 'priorities_deps';

export const ScheduleAView: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<SectionFilter>('all');
  const [simulatedPhase, setSimulatedPhase] = useState<'pre_event' | 'event_day' | 'post_event'>('pre_event');
  const [selectedScopeArea, setSelectedScopeArea] = useState<string>('A1');

  // Interactive demo states
  const [wishlistItems, setWishlistItems] = useState([
    { id: 'merch_001', name: 'Tour de Rotary 2026 Pro Cycling Jersey', size: 'L', price: '65,000 TSh', inWishlist: true },
    { id: 'merch_002', name: 'Dar es Salaam Commemorative Finisher Medal Display', size: 'Standard', price: '30,000 TSh', inWishlist: true },
    { id: 'merch_003', name: 'Bio-Degradable 750ml Fast-Flow Bottle', size: '750ml', price: '15,000 TSh', inWishlist: false }
  ]);

  const [promoCodes, setPromoCodes] = useState([
    { code: 'ROTARY2026', discount: '10%', uses: '87 / 500', active: true },
    { code: 'EARLYBIRD20', discount: '20%', uses: '142 / 200', active: true },
    { code: 'CRDBVIP', discount: '15%', uses: '23 / 100', active: true }
  ]);

  const [newPromoInput, setNewPromoInput] = useState({ code: '', discount: '15%' });
  const [pickupCollected, setPickupCollected] = useState(false);
  const [activeRefundTab, setActiveRefundTab] = useState<'all' | 'pending' | 'resolved'>('all');

  const toggleWishlist = (id: string) => {
    setWishlistItems(prev => prev.map(item => 
      item.id === id ? { ...item, inWishlist: !item.inWishlist } : item
    ));
  };

  const handleAddPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoInput.code) return;
    setPromoCodes(prev => [
      ...prev,
      { code: newPromoInput.code.toUpperCase(), discount: newPromoInput.discount, uses: '0 / 100', active: true }
    ]);
    setNewPromoInput({ code: '', discount: '15%' });
  };

  const scopeSections = [
    {
      id: 'A1',
      code: 'A1. Public Experience',
      category: 'public_participant',
      priority: 'Priority 1',
      status: 'Fully Implemented',
      summary: 'Public event presentation, cause awareness, countdown, and mobile-first visual identity.',
      contractRequirements: [
        'Home, About, Our Cause, Events, Sponsors, Merch, Collectibles, Contact and campaign-ready landing sections.',
        'Phase-aware pre-event presentation, countdown, registration calls to action and post-event content switching capability.',
        'Mobile-first responsive experience with strong photography, event video and Dar es Salaam visual identity.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/campaigns/landing', desc: 'Campaign landing metadata with hero statistics and dynamic CTA' },
        { method: 'GET', path: '/api/v1/activities', desc: 'Public activities catalogue (Cyclathon, Marathon, Walkathon, Yoga)' },
        { method: 'GET', path: '/api/v1/activities/:id', desc: 'Route map, elevation profile, start arch and capacity limits' },
        { method: 'GET', path: '/api/v1/admin/content', desc: 'Phase-aware CMS content (pre-event, event-day, post-event)' }
      ],
      dbTables: ['event_editions', 'activities', 'campaigns']
    },
    {
      id: 'A2',
      code: 'A2. Participant Portal',
      category: 'public_participant',
      priority: 'Priority 1',
      status: 'Fully Implemented',
      summary: 'Self-service athlete portal, registrations, receipts, training progress, digital passes & wishlist.',
      contractRequirements: [
        'Registration and profile, registered events, order history and receipts, reservations and payment status.',
        'Secure checkout and participant notifications.',
        'Training area with progress, activity badges and eligible fitness integrations, subject to third-party authorization.',
        'Downloadable participation badges, certificates and social assets.',
        'Digital collectibles gallery, QR verification and shareable pages.',
        'Wishlist, order tracking, pickup confirmation and selected account preferences.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/participant/profile', desc: 'Athlete profile, emergency contact, t-shirt size, blood group' },
        { method: 'GET', path: '/api/v1/participant/orders', desc: 'Order history, payment status, receipts and line-item breakdown' },
        { method: 'GET', path: '/api/v1/participant/tickets', desc: 'Entry tickets, assigned BIB numbers, wave timing and QR entry pass' },
        { method: 'GET', path: '/api/v1/participant/training', desc: 'Weekly mileage progress, training goals, badges and Strava sync status' },
        { method: 'GET', path: '/api/v1/participant/wishlist', desc: 'Participant merchandise wishlist with one-click move to cart' },
        { method: 'GET', path: '/api/v1/participant/orders/:id/tracking', desc: 'Merchandise kit packing and Gymkhana Club pickup milestones' },
        { method: 'POST', path: '/api/v1/participant/orders/:id/pickup', desc: 'Expo Marshall QR verification to confirm merchandise kit collection' },
        { method: 'GET', path: '/api/v1/participant/preferences', desc: 'SMS vs email channel toggle, emergency broadcasts, dietary choice' }
      ],
      dbTables: ['profiles', 'tickets', 'orders', 'order_items', 'digital_collectibles']
    },
    {
      id: 'A3',
      code: 'A3. Volunteer Portal',
      category: 'ops_portals',
      priority: 'Priority 2',
      status: 'Fully Implemented',
      summary: 'Shift rosters, zone assignments, operational notices, and ticket QR validation.',
      contractRequirements: [
        'Volunteer registration, assigned role, shift/zone information, notices, attendance support and task status.',
        'Operational updates from HQ and relevant event-day communications.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/volunteer/shift', desc: 'Assigned station (e.g., Kivukoni Waterfront, Toure Drive), shift hours, supervisor' },
        { method: 'GET', path: '/api/v1/volunteer/notices', desc: 'Real-time incident updates, briefing documents and safety guidelines' },
        { method: 'POST', path: '/api/v1/volunteer/checkin-ticket', desc: 'Cryptographic QR scanner tool for validating runner and cyclist passes' }
      ],
      dbTables: ['volunteer_assignments', 'profiles', 'tickets']
    },
    {
      id: 'A4',
      code: 'A4. Sponsor Portal',
      category: 'ops_portals',
      priority: 'Priority 2',
      status: 'Fully Implemented',
      summary: 'Brand deliverables, activation links, banner analytics, and co-branded certificates.',
      contractRequirements: [
        'Sponsor profile, activation assets, campaign links, agreed benefits, reporting snapshots and branded collectible/certificate options.',
        'Sponsor-facing recognition and activation tracking where specified.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/sponsor/portal', desc: 'Tier deliverables (Title, Gold, Silver), brand logo placements, impression counts' },
        { method: 'GET', path: '/api/v1/sponsor/assets', desc: 'Downloadable official event logo marks, social co-branding kits, and photo links' }
      ],
      dbTables: ['sponsor_deliverables', 'profiles', 'digital_collectibles']
    },
    {
      id: 'A5',
      code: 'A5. Partner Portal',
      category: 'ops_portals',
      priority: 'Priority 2',
      status: 'Fully Implemented',
      summary: 'Medical agency coordination, municipal clearances, police escorts, and referral links.',
      contractRequirements: [
        'Partner profile, agreed collaboration details, campaign materials, submissions and referral/activation information.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/partner/clearances', desc: 'Ambulance station staging, police motorcycle escort zones, road closures' },
        { method: 'POST', path: '/api/v1/partner/submissions', desc: 'Upload logistics sign-offs, municipal permits and inspection checklists' }
      ],
      dbTables: ['partner_clearances', 'profiles', 'audit_logs']
    },
    {
      id: 'A6',
      code: 'A6. HQ Admin Command Centre',
      category: 'commerce_comms',
      priority: 'Priority 1',
      status: 'Fully Implemented',
      summary: 'Master control: user directory, promo codes, ticket capacity, 7-day inventory release, refunds, audit logs.',
      contractRequirements: [
        'User, registration, order, inventory, reservation, content and campaign management.',
        'Volunteer, sponsor and partner management.',
        'Promo codes, discounts, ticket capacity, early bird controls and scheduled content.',
        'SMS/email queue monitoring, template management and manual send controls where supported.',
        'Analytics, exports, activity logs and operational dashboards.',
        'Issue/refund workflow, role-based access and administrative audit trail.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/admin/overview', desc: 'Financial gross revenue, registrations count, check-in velocity, inventory reserved' },
        { method: 'GET', path: '/api/v1/admin/orders', desc: 'Order search, transaction filter, status modification' },
        { method: 'GET', path: '/api/v1/admin/users', desc: 'User directory with 5-role RBAC elevation' },
        { method: 'GET', path: '/api/v1/admin/inventory', desc: 'Apparel stock levels, active 7-day reservations, automated expiration status' },
        { method: 'POST', path: '/api/v1/admin/inventory/release-expired', desc: 'Instant release trigger for abandoned reservations' },
        { method: 'GET', path: '/api/v1/admin/promo-codes', desc: 'Promo code management, discount %, expiration and usage counters' },
        { method: 'GET', path: '/api/v1/admin/capacities', desc: 'Early bird vs regular tier cutoffs and participant caps per activity' },
        { method: 'GET', path: '/api/v1/admin/refunds', desc: 'Issue / refund dispute resolution with PayMe reverse credit workflow' },
        { method: 'GET', path: '/api/v1/admin/audit-logs', desc: 'Immutable security ledger of all privileged operational actions' }
      ],
      dbTables: ['orders', 'profiles', 'inventory_reservations', 'audit_logs', 'communication_templates']
    },
    {
      id: 'A7',
      code: 'A7. Payments and Commerce',
      category: 'commerce_comms',
      priority: 'Priority 1',
      status: 'Fully Implemented',
      summary: 'PayMe Africa checkout, 7-day apparel reservation window, retry flow, pickup or shipping selector.',
      contractRequirements: [
        'PayMe Africa integration, cart, itemized checkout, payment status, retry and confirmation flow.',
        'Merch reservation window and release process.',
        'Pickup or shipping selection and confirmation.'
      ],
      endpoints: [
        { method: 'POST', path: '/api/v1/cart/checkout', desc: 'Mixed cart atomic checkout; locks stock in inventory_reservations for 7 days' },
        { method: 'POST', path: '/api/v1/payments/initiate', desc: 'Dispatches USSD push to M-Pesa / Tigo Pesa / Airtel Money / Halopesa via PayMe' },
        { method: 'POST', path: '/api/v1/payments/payme/webhook', desc: 'Idempotent HMAC-SHA256 callback confirming receipt, issuing BIB and sending SMS' },
        { method: 'GET', path: '/api/v1/payments/status/:order_number', desc: 'Real-time payment verification and receipt retrieval' },
        { method: 'POST', path: '/api/v1/payments/retry', desc: 'Re-initiates mobile money payment without creating duplicate order items' }
      ],
      dbTables: ['orders', 'order_items', 'inventory_reservations', 'payments', 'product_variants']
    },
    {
      id: 'A8',
      code: 'A8. Digital Collectibles and Social Assets',
      category: 'commerce_comms',
      priority: 'Priority 2',
      status: 'Fully Implemented',
      summary: 'Cryptographic finisher certificates, Polygon NFT records, public verification, and Twibbon frame generator.',
      contractRequirements: [
        'Tiered digital collectibles and unique certificate generation.',
        'Public verification page with unique identifier and QR.',
        'Shareable collectible pages and downloadable PNG/PDF assets.',
        'Twibbon-style frame generator for participant self-branding and sharing.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/collectibles/verify/:hash', desc: 'Public verification page with cryptographic hash and immutable finisher data' },
        { method: 'GET', path: '/api/v1/participant/certificates', desc: 'Downloadable PDF certificates with Polygon NFT tx reference' },
        { method: 'GET', path: '/api/v1/social/twibbon/frames', desc: 'Available campaign twibbon overlays (I am Riding for Maternal Health, etc.)' },
        { method: 'POST', path: '/api/v1/social/twibbon/generate', desc: 'Composes participant avatar with official 2026 frame with one-click social share' }
      ],
      dbTables: ['digital_collectibles', 'social_shares', 'tickets']
    },
    {
      id: 'A9',
      code: 'A9. Communications',
      category: 'commerce_comms',
      priority: 'Priority 1',
      status: 'Fully Implemented',
      summary: 'Automated SMS and email templates, reservation reminders, race briefings, and dispatch logs.',
      contractRequirements: [
        'Event confirmation, reservation reminders, payment reminders, event briefing and post-event messaging.',
        'SMS and email templates with scheduled delivery workflows where supported.',
        'Newsletter capability and engagement tracking through the selected email platform.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/communications/templates', desc: 'Pre-configured templates: ticket confirmation, Day 4/6 reservation reminders, emergency alerts' },
        { method: 'POST', path: '/api/v1/communications/preview', desc: 'Merge tag previewer ({{full_name}}, {{bib_number}}, {{flag_off_time}})' },
        { method: 'POST', path: '/api/v1/communications/send-test', desc: 'Single test dispatch to verify delivery via Textify Africa SMS' },
        { method: 'GET', path: '/api/v1/communications/logs', desc: 'Audit trail of delivered and queued communications' }
      ],
      dbTables: ['communication_templates', 'audit_logs']
    },
    {
      id: 'A10',
      code: 'A10. Release Priority',
      category: 'priorities_deps',
      priority: 'Governance',
      status: 'Fully Implemented',
      summary: 'Three-tiered development prioritization matrix aligned to September 15 handoff and November 1 Event Day.',
      contractRequirements: [
        'Priority 1: registration, ticketing, payment, participant access, admin control and core event communications.',
        'Priority 2: merchandise, collectibles, volunteer/sponsor/partner operations and campaign tooling.',
        'Priority 3: enhancement features that depend on third-party approvals or additional vendor capacity.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/health', desc: 'Backend service uptime, database connection, and API version' }
      ],
      dbTables: ['All relational tables']
    },
    {
      id: 'A11',
      code: 'A11. External Dependency Note',
      category: 'priorities_deps',
      priority: 'Governance',
      status: 'Fully Implemented',
      summary: 'Graceful zero-crash fallback engine for third-party gateways (PayMe, Textify, Strava, Resend).',
      contractRequirements: [
        'Certain functions depend on the Client providing working vendor accounts and approvals before the relevant integration can be activated. The Build Team will configure the approved integrations once the required credentials and access are available.'
      ],
      endpoints: [
        { method: 'GET', path: '/api/v1/fitness/strava/auth-url', desc: 'OAuth handshake fallback with graceful simulated tokens if client ID is unpopulated' },
        { method: 'POST', path: '/api/v1/payments/initiate', desc: 'Operates with realistic mock USSD push when PAYME_API_KEY is not yet supplied' }
      ],
      dbTables: ['profiles', 'payments']
    }
  ];

  const filteredSections = scopeSections.filter(s => {
    if (activeFilter === 'all') return true;
    return s.category === activeFilter;
  });

  const selectedSection = scopeSections.find(s => s.id === selectedScopeArea) || scopeSections[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Executive Schedule A Scope Banner */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-md text-white relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Schedule A Contract Specification Verified • September 2026 Production Handoff</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Schedule A | Platform Delivery Scope Matrix
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Every experience area from <strong>A1 through A11</strong> has been architected, mapped to relational database models, equipped with REST controllers, and verified for production handoff to <code>smart01-bot</code>.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-[11px] text-slate-400">Total Scope Areas</div>
              <div className="text-lg font-bold text-white font-mono">11 / 11 Mapped</div>
              <div className="text-[10px] text-emerald-400 font-medium">100% Contract Coverage</div>
            </div>
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-[11px] text-slate-400">REST Endpoints Built</div>
              <div className="text-lg font-bold text-blue-400 font-mono">35+ Live Routes</div>
              <div className="text-[10px] text-slate-400 font-medium">Express 5 + Supabase</div>
            </div>
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-[11px] text-slate-400">Priority 1 Deliverables</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">100% Complete</div>
              <div className="text-[10px] text-slate-400 font-medium">Core Reg, Pay & Comms</div>
            </div>
            <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
              <div className="text-[11px] text-slate-400">External Fallbacks</div>
              <div className="text-lg font-bold text-purple-400 font-mono">Zero-Crash Safe</div>
              <div className="text-[10px] text-slate-400 font-medium">A11 Dependency Guard</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All 11 Scope Areas
          </button>
          <button
            onClick={() => setActiveFilter('public_participant')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'public_participant'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A1 - A2: Public & Participant
          </button>
          <button
            onClick={() => setActiveFilter('ops_portals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'ops_portals'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A3 - A5: Volunteer, Sponsor & Partner
          </button>
          <button
            onClick={() => setActiveFilter('commerce_comms')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'commerce_comms'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A6 - A9: Admin, PayMe & Social
          </button>
          <button
            onClick={() => setActiveFilter('priorities_deps')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'priorities_deps'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            A10 - A11: Priorities & Dependencies
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredSections.length} of 11 Sections
        </div>
      </div>

      {/* Main Grid: Master Section List & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scope Areas Cards */}
        <div className="lg:col-span-5 space-y-3">
          {filteredSections.map((sec) => {
            const isSelected = selectedScopeArea === sec.id;
            return (
              <div
                key={sec.id}
                onClick={() => setSelectedScopeArea(sec.id)}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{sec.code}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        sec.priority === 'Priority 1'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sec.priority === 'Priority 2'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}>
                        {sec.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {sec.summary}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Check className="w-3 h-3" />
                      Ready
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{sec.endpoints.length} REST Endpoints</span>
                  <span className="font-mono text-slate-400">{sec.dbTables.join(', ')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Section Inspector & Live Verification */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            {/* Header of Selected Section */}
            <div className="flex items-start justify-between gap-4 flex-wrap border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                    Schedule A Specification
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified for 15 Sept 2026
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedSection.code}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedSection.summary}
                </p>
              </div>

              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                selectedSection.priority === 'Priority 1'
                  ? 'bg-emerald-100 text-emerald-800'
                  : selectedSection.priority === 'Priority 2'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {selectedSection.priority}
              </span>
            </div>

            {/* Official Scope of Work Contract Requirements */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Agreed Contract Working Scope (Schedule A)
              </h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                {selectedSection.contractRequirements.map((req, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Endpoints Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                Backend Controller Endpoints Mounted
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {selectedSection.endpoints.map((ep, idx) => (
                    <div key={idx} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          ep.method === 'GET' ? 'bg-blue-50 text-blue-700' :
                          ep.method === 'POST' ? 'bg-emerald-50 text-emerald-700' :
                          ep.method === 'PUT' ? 'bg-amber-50 text-amber-700' :
                          ep.method === 'PATCH' ? 'bg-purple-50 text-purple-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {ep.method}
                        </span>
                        <code className="text-xs font-mono font-medium text-slate-800">{ep.path}</code>
                      </div>
                      <span className="text-[11px] text-slate-500 sm:text-right max-w-sm">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Feature Demo based on Selected Section */}
            {selectedSection.id === 'A1' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-800">A1 Live Simulator: Phase-Aware Event State</span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    {(['pre_event', 'event_day', 'post_event'] as const).map(phase => (
                      <button
                        key={phase}
                        onClick={() => setSimulatedPhase(phase)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                          simulatedPhase === phase ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {phase === 'pre_event' ? 'Pre-Event' : phase === 'event_day' ? 'Event Day' : 'Post-Event'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Active Hero CTA:</span>
                    <strong className="text-slate-800 font-medium">
                      {simulatedPhase === 'pre_event' ? 'Register Now (Early Bird Wave Active)' :
                       simulatedPhase === 'event_day' ? 'Live Tracker & Gate Check-in QR' :
                       'View Official Race Results & Download Finisher Certificates'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Countdown Widget:</span>
                    <strong className="text-slate-800 font-mono">
                      {simulatedPhase === 'pre_event' ? '59 Days : 04 Hours : 52 Mins' :
                       simulatedPhase === 'event_day' ? 'LIVE NOW (Flag-Off 06:00 AM EAT)' :
                       'Event Concluded • M&E Evaluation Underway'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Cause Focus:</span>
                    <span className="text-blue-600 font-medium">Rotary Club Maternal & Neonatal Health Initiative</span>
                  </div>
                </div>
              </div>
            )}

            {selectedSection.id === 'A2' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">A2 Live Simulator: Participant Wishlist & Pickup Tracking</span>
                  <span className="text-[11px] text-slate-500">Logged in as: amina@example.com</span>
                </div>

                {/* Wishlist Interactive List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-600">Saved Wishlist Items:</div>
                  <div className="grid grid-cols-1 gap-2">
                    {wishlistItems.map(item => (
                      <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{item.size} • {item.price}</div>
                        </div>
                        <button
                          onClick={() => toggleWishlist(item.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                            item.inWishlist 
                              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                              : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                          }`}
                        >
                          {item.inWishlist ? 'Remove Wishlist' : 'Add to Wishlist'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pickup Confirmation Tracker */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Kit Order: TDR-2026-52189</div>
                      <div className="text-[11px] text-slate-500">Station: Dar es Salaam Gymkhana Club Official Expo Booth</div>
                    </div>
                    <button
                      onClick={() => setPickupCollected(!pickupCollected)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        pickupCollected 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {pickupCollected ? 'Status: COLLECTED' : 'Status: READY FOR PICKUP'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedSection.id === 'A6' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">A6 Live Simulator: Promo Codes & Capacity Controls</span>
                  <span className="text-[11px] font-mono text-emerald-600">HQ Admin Portal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {promoCodes.map((p, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-blue-700">{p.code}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded">{p.discount} OFF</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Uses: {p.uses}</div>
                    </div>
                  ))}
                </div>

                {/* Add new promo code */}
                <form onSubmit={handleAddPromo} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New code (e.g. ROTARYHERO)"
                    value={newPromoInput.code}
                    onChange={e => setNewPromoInput({ ...newPromoInput, code: e.target.value })}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={newPromoInput.discount}
                    onChange={e => setNewPromoInput({ ...newPromoInput, discount: e.target.value })}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700"
                  >
                    <option value="10%">10% OFF</option>
                    <option value="15%">15% OFF</option>
                    <option value="20%">20% OFF</option>
                    <option value="50%">50% OFF</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    Create
                  </button>
                </form>
              </div>
            )}

            {selectedSection.id === 'A10' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">A10 Release Priority Breakdown</div>
                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" /> Priority 1: Core Platform & Ticketing
                      </span>
                      <span className="text-emerald-600">100% Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Registration, activity ticketing, PayMe payment flow, mixed cart, participant profile & core SMS/email notifications.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" /> Priority 2: Operations, Portals & Merch
                      </span>
                      <span className="text-blue-600">100% Ready</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Official merchandise catalog with 7-day holds, volunteer assignments, sponsor recognition, twibbon generator & collectibles.
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <CheckCircle2 className="w-4 h-4" /> Priority 3: Third-Party Integrations
                      </span>
                      <span className="text-purple-600">Graceful Fallback Mode</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Strava OAuth sync and Polygon NFT blockchain minting operate with zero-crash fallbacks until client supplies production keys.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedSection.id === 'A11' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-800">A11 External Vendor Dependency Readiness Matrix</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>PayMe Africa (Payments)</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">Ready</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Requires: PAYME_API_KEY, PAYME_WEBHOOK_SECRET</div>
                    <div className="text-[10px] text-blue-600 font-mono">Fallback: Sandbox USSD simulator active</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Textify Africa (SMS)</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-semibold">Ready</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Requires: TEXTIFY_API_KEY, SENDER_ID (ROTARY_DSM)</div>
                    <div className="text-[10px] text-blue-600 font-mono">Fallback: Console dispatcher with valid payload log</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Strava API (Fitness Tracking)</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-semibold">Fallback Active</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Requires: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET</div>
                    <div className="text-[10px] text-purple-600 font-mono">Fallback: Mock token exchange & 64.5km progress</div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Polygon (Digital Collectibles)</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">Hybrid Verified</span>
                    </div>
                    <div className="text-[11px] text-slate-500">Requires: POLYGON_RPC_URL, CONTRACT_ADDRESS</div>
                    <div className="text-[10px] text-blue-600 font-mono">Fallback: SHA-256 cryptographic verification URL</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
