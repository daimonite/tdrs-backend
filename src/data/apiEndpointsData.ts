import { ApiEndpointDef } from '../types';

export const API_ENDPOINTS: ApiEndpointDef[] = [
  // 1. PARTICIPANT PORTAL ENDPOINTS
  {
    id: 'participant-activities',
    portal: 'participant',
    category: 'Discovery & Registration',
    method: 'GET',
    path: '/api/v1/activities',
    summary: 'List official activities, route GPS, capacity, and current pricing',
    description: 'Returns Cyclathon, Marathon, Walkathon, Zumba, Yoga, and Community Walk with early-bird vs standard pricing and remaining slot capacity.',
    authRequired: false,
    allowedRoles: ['participant', 'volunteer', 'sponsor', 'partner', 'admin'],
    queryParams: [
      { name: 'edition_year', type: 'integer', required: false, description: 'Filter by year (defaults to active edition: 2026)' }
    ],
    responseExample: {
      status: 'success',
      data: [
        {
          id: 'act-cyc-60k',
          title: 'Cyclathon 60km Pro Tour',
          type: 'Cyclathon',
          distance_km: 60.0,
          early_bird_price_tsh: 35000,
          standard_price_tsh: 50000,
          capacity: 400,
          registered_count: 245,
          early_bird_active: true,
          route_geojson: { type: 'FeatureCollection', features: [] }
        },
        {
          id: 'act-mar-21k',
          title: 'Half Marathon 21km',
          type: 'Marathon',
          distance_km: 21.1,
          early_bird_price_tsh: 30000,
          standard_price_tsh: 45000,
          capacity: 600,
          registered_count: 310,
          early_bird_active: true
        }
      ]
    },
    notes: 'Public endpoint cached with 60s CDN TTL. Returns early_bird_active flag based on edition configuration.'
  },
  {
    id: 'participant-cart-checkout',
    portal: 'participant',
    category: 'Mixed Cart & Checkout',
    method: 'POST',
    path: '/api/v1/cart/checkout',
    summary: 'Submit Mixed Cart order (Tickets + Merch Reservation)',
    description: 'Atomically creates an order with both activity registrations and physical merchandise items. Generates 7-day inventory reservations for apparel items.',
    authRequired: true,
    allowedRoles: ['participant'],
    requestBody: {
      items: [
        {
          item_type: 'ticket',
          activity_id: 'act-cyc-60k',
          quantity: 1,
          participant_details: {
            full_name: 'Juma Mwamburi',
            phone: '+255714000111',
            tshirt_size: 'L',
            emergency_contact: { name: 'Amina Mwamburi', phone: '+255714000222' }
          }
        },
        {
          item_type: 'merchandise',
          product_variant_id: 'var-jersey-black-l',
          quantity: 1
        }
      ],
      promo_code: 'ROTARY2026',
      referral_code: 'ROTARY-KIM'
    },
    responseExample: {
      status: 'created',
      order_id: 'ord_998124',
      order_number: 'TDR-2026-89412',
      subtotal_tsh: 85000,
      discount_tsh: 10000,
      total_tsh: 75000,
      payment_gateway: 'PayMe Africa',
      reservation_expires_at: '2026-09-03T10:00:00Z',
      payme_checkout_url: 'https://checkout.paymeafrica.com/pay/tdr_ord_998124'
    },
    notes: 'Applies database row-level locking on inventory variants to prevent overselling.'
  },
  {
    id: 'payme-webhook-callback',
    portal: 'participant',
    category: 'Payment Integrations',
    method: 'POST',
    path: '/api/v1/payments/payme/webhook',
    summary: 'PayMe Africa server-to-server payment confirmation webhook',
    description: 'Idempotent webhook handler verifying HMAC signature, marking order as paid, issuing QR tickets, locking merchandise, and triggering SMS & Email confirmations.',
    authRequired: false,
    allowedRoles: ['participant', 'admin'],
    requestBody: {
      event: 'payment.success',
      idempotency_key: 'idemp-tdr-2026-ord-998124-x9',
      reference: 'PAYME-TXN-88419204',
      order_number: 'TDR-2026-89412',
      amount: 75000,
      currency: 'TZS',
      provider_channel: 'M-Pesa',
      customer_phone: '+255714000111',
      status: 'SUCCESS',
      signature: 'sha256=9b7c8d9e2a1b4c3d...'
    },
    responseExample: {
      received: true,
      processed: true,
      order_status: 'paid',
      tickets_generated: 1,
      sms_dispatched: true,
      email_dispatched: true
    },
    notes: 'Guarantees idempotency. If PayMe retries webhook 5 times, tickets and SMS will only be generated on the first successful callback.'
  },
  {
    id: 'participant-my-tickets',
    portal: 'participant',
    category: 'Tickets & Proof of Entry',
    method: 'GET',
    path: '/api/v1/participant/tickets',
    summary: 'Get participant tickets, BIB assignments, and secure QR tokens',
    description: 'Retrieves all confirmed tickets with cryptographic QR tokens for Event Day gate entry and printable PDF download URLs.',
    authRequired: true,
    allowedRoles: ['participant'],
    responseExample: {
      status: 'success',
      tickets: [
        {
          id: 'tkt_10293',
          bib_number: 'CYC-2026-042',
          activity: 'Cyclathon 60km Pro Tour',
          date: '2026-11-01T06:00:00+03:00',
          venue: 'Dar es Salaam Yacht Club to Bagamoyo',
          qr_token: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
          checked_in: false,
          pdf_download_url: 'https://storage.supabase.co/v1/object/public/tickets/tkt_10293.pdf'
        }
      ]
    },
    notes: 'QR token can be scanned offline by the Volunteer check-in scanner.'
  },
  {
    id: 'participant-strava-sync',
    portal: 'participant',
    category: 'Fitness & Training',
    method: 'POST',
    path: '/api/v1/participant/training/sync',
    summary: 'Sync training distance from Strava / Google Health Connect',
    description: 'Fetches recent athlete distance, frequency, and streak days. Calculates unlocked milestone badges and updates community leaderboard if opted in.',
    authRequired: true,
    allowedRoles: ['participant'],
    requestBody: {
      provider: 'strava',
      days_lookback: 7
    },
    responseExample: {
      status: 'success',
      weekly_distance_km: 42.5,
      training_days_this_week: 4,
      current_streak_weeks: 3,
      new_badges_unlocked: [
        { id: 'badge-40k-week', title: '40km Century Week', icon: '🏆' }
      ],
      community_sharing: 'aggregate_badge_only'
    },
    notes: 'Data minimization: Only aggregate metrics and badges are stored. Raw GPS routes are NOT retained.'
  },

  // 2. VOLUNTEER PORTAL ENDPOINTS
  {
    id: 'volunteer-shifts',
    portal: 'volunteer',
    category: 'Volunteer Operations',
    method: 'GET',
    path: '/api/v1/volunteer/shifts',
    summary: 'List available and assigned volunteer zones and shifts',
    description: 'Returns available Event Day zones (Start Line, Water Point 1-4, First Aid, Bag Drop, Finish Line) with briefing documents and assigned check-in rosters.',
    authRequired: true,
    allowedRoles: ['volunteer', 'admin'],
    responseExample: {
      status: 'success',
      assigned_shift: {
        id: 'shift_water_3',
        zone_name: 'Water Point 3 (Kunduchi Beach Route)',
        time_window: '06:30 - 11:30',
        lead_contact: '+255788112233',
        briefing_pdf: 'https://storage.supabase.co/briefings/water-point-manual.pdf',
        checkin_scanner_authorized: true
      }
    },
    notes: 'Volunteers with checkin_scanner_authorized can access the offline QR ticket check-in camera tool.'
  },
  {
    id: 'volunteer-scan-ticket',
    portal: 'volunteer',
    category: 'Volunteer Operations',
    method: 'POST',
    path: '/api/v1/volunteer/checkin-ticket',
    summary: 'Scan and validate participant QR ticket code at gate',
    description: 'Scans cryptographic QR token, marks ticket as checked_in, records volunteer ID & timestamp, and unlocks post-event participation badge.',
    authRequired: true,
    allowedRoles: ['volunteer', 'admin'],
    requestBody: {
      qr_token: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      station_id: 'gate-start-line-alpha'
    },
    responseExample: {
      status: 'checked_in',
      participant_name: 'Juma Mwamburi',
      bib_number: 'CYC-2026-042',
      activity: 'Cyclathon 60km Pro Tour',
      tshirt_collected: true,
      timestamp: '2026-11-01T06:12:44+03:00'
    },
    notes: 'Returns 409 Conflict if ticket has already been checked in to prevent duplicate gate entries.'
  },

  // 3. SPONSOR PORTAL ENDPOINTS
  {
    id: 'sponsor-deliverables',
    portal: 'sponsor',
    category: 'Sponsorship & Brand',
    method: 'GET',
    path: '/api/v1/sponsor/deliverables',
    summary: 'Get sponsor tier benefits, logo uploads, and activation checklist',
    description: 'Returns sponsor tier (Platinum, Gold, Silver, Route Partner), VIP passes allocated, logo dimensions for print, and digital collectible drop status.',
    authRequired: true,
    allowedRoles: ['sponsor', 'admin'],
    responseExample: {
      status: 'success',
      sponsor_name: 'Vodacom Tanzania Foundation',
      tier: 'Platinum Sponsor',
      vip_passes_total: 20,
      vip_passes_claimed: 14,
      deliverables: [
        { id: 'logo_hero', title: 'High-Res Vector Logo for Start Banner', status: 'approved' },
        { id: 'sponsor_badge', title: 'Custom Branded Finisher Digital Badge', status: 'ready_for_review' }
      ],
      campaign_clicks: 14820
    },
    notes: 'Sponsors can also download their real-time impact report and engagement analytics.'
  },

  // 4. PARTNER PORTAL ENDPOINTS
  {
    id: 'partner-tasks',
    portal: 'partner',
    category: 'Logistics & Partnerships',
    method: 'GET',
    path: '/api/v1/partner/tasks',
    summary: 'View assigned operational deliverables and logistics deadlines',
    description: 'Enables medical partners (Aga Khan/Muhimbili), police escort coordinators, and hydration providers to view route maps, logistics schedules, and submit delivery approvals.',
    authRequired: true,
    allowedRoles: ['partner', 'admin'],
    responseExample: {
      status: 'success',
      partner_name: 'Red Cross Tanzania Emergency Response',
      assigned_ambulances: 4,
      assigned_first_aid_posts: 6,
      readiness_checklist_status: 'verified_complete'
    },
    notes: 'Allows file uploads of route safety clearances and traffic police permits.'
  },

  // 5. HQ COMMAND CENTRE ADMIN ENDPOINTS
  {
    id: 'admin-overview',
    portal: 'admin',
    category: 'HQ Command Centre',
    method: 'GET',
    path: '/api/v1/admin/dashboard/overview',
    summary: 'HQ Command Centre executive operational KPI telemetry',
    description: 'Returns real-time totals: Total Registrations by Activity, Total Revenue in TSh, Pending Payments, Reserved Stock vs Available, Volunteer Allocation %, and SMS Queue health.',
    authRequired: true,
    allowedRoles: ['admin'],
    responseExample: {
      status: 'success',
      edition_year: 2026,
      current_phase: 'pre_event',
      total_registrations: 1420,
      total_revenue_tsh: 84500000,
      fundraising_target_tsh: 120000000,
      pending_reservations_count: 86,
      unpaid_reservations_tsh: 5840000,
      volunteers_registered: 118,
      volunteers_assigned: 110,
      sms_delivered_today: 430,
      system_health: 'optimal'
    },
    notes: 'Super Admin command endpoint. Real-time aggregated database view with 10s caching.'
  },
  {
    id: 'admin-switch-phase',
    portal: 'admin',
    category: 'HQ Command Centre',
    method: 'PATCH',
    path: '/api/v1/admin/events/phase',
    summary: 'Transition platform phase (pre_event -> event_day -> post_event)',
    description: 'Dynamically shifts site behavior. In event_day mode, live check-ins & urgent broadcasts activate. In post_event mode, galleries, M&E exports, and certificate downloads unlock.',
    authRequired: true,
    allowedRoles: ['admin'],
    requestBody: {
      new_phase: 'event_day',
      reason: '1 November 2026 Race Day Commencement',
      override_automatic_schedule: true
    },
    responseExample: {
      status: 'phase_updated',
      previous_phase: 'pre_event',
      current_phase: 'event_day',
      timestamp: '2026-11-01T04:30:00+03:00',
      active_features: ['live_qr_scanning', 'sms_morning_briefing', 'incident_hotline']
    },
    notes: 'Automatically logs transition to audit_logs table with admin user ID.'
  },
  {
    id: 'admin-release-expired-reservations',
    portal: 'admin',
    category: 'Inventory & Operations',
    method: 'POST',
    path: '/api/v1/admin/inventory/release-expired',
    summary: 'Trigger 7-Day Inventory Expiry worker to return unpaid stock',
    description: 'Finds all reservations where expires_at <= NOW() and status = "active", marks them expired, releases stock count back to product_variants, and logs SMS notice.',
    authRequired: true,
    allowedRoles: ['admin'],
    responseExample: {
      status: 'success',
      expired_reservations_released: 14,
      stock_units_restored: 18,
      released_value_tsh: 980000,
      timestamp: '2026-08-28T03:45:00Z'
    },
    notes: 'Runs automatically on a 1-hour cron schedule, but can also be manually triggered from HQ.'
  }
];
