import { SprintPhase } from '../types';

export const SPRINT_PHASES: SprintPhase[] = [
  {
    id: 'sprint-1',
    dates: '19 - 23 August 2026',
    title: 'Sprint 1: Discovery & Database Architecture',
    focus: 'Supabase PostgreSQL schema, RLS policies, 5-role RBAC, and core project setup',
    status: 'Completed',
    deliverables: [
      {
        title: 'PostgreSQL Relational DDL & Migrations',
        details: 'Constructed event_editions, activities, profiles, orders, product_variants, inventory_reservations, payments, and tickets tables.',
        done: true,
        module: 'Database Architecture'
      },
      {
        title: '5-Role RBAC & Row Level Security (RLS)',
        details: 'Configured granular permissions for Participant, Volunteer, Sponsor, Partner, and Admin roles.',
        done: true,
        module: 'Authentication & Security'
      },
      {
        title: 'Environment & Secrets Configuration',
        details: 'Configured Supabase, PayMe Africa, Textify Africa, Resend, and Strava environment profiles in .env.',
        done: true,
        module: 'DevOps & Setup'
      }
    ],
    keyChecklist: [
      'PostgreSQL schema deployed to Supabase staging instance',
      'Database foreign keys, check constraints, and performance indexes validated',
      'Row Level Security policies tested against unauthorized cross-user access',
      'Sprint 2 tickets estimated and backlog prioritized'
    ]
  },
  {
    id: 'sprint-2',
    dates: '24 August - 4 September 2026',
    title: 'Sprint 2: Core Platform & Mixed Cart Engine',
    focus: 'Public activities API, mixed-cart checkout, 7-day inventory locking, and participant account',
    status: 'In Progress',
    deliverables: [
      {
        title: 'Public Activities & Routes API (/api/v1/activities)',
        details: 'Serves Cyclathon 60km, Half Marathon 21km, Walkathon 10km, Zumba, Yoga, and Community Walk with pricing & capacity checks.',
        done: true,
        module: 'Ticketing & Registration'
      },
      {
        title: 'Mixed Cart Checkout & Pricing Engine',
        details: 'Handles simultaneous ticket registrations and physical merchandise orders in single TSh transactions with promo codes.',
        done: true,
        module: 'Orders & Commerce'
      },
      {
        title: '7-Day Merchandise Reservation State Machine',
        details: 'Locks apparel stock on reservation; tracks day4_reminded and day6_reminded flags with automated release worker.',
        done: true,
        module: 'Inventory Engine'
      },
      {
        title: 'Participant Portal Core API',
        details: 'Endpoints for viewing purchased tickets, active merchandise reservations, payment recovery, and profile medical details.',
        done: false,
        module: 'Participant Experience'
      }
    ],
    keyChecklist: [
      'Verify mixed-cart atomic checkout under simulated concurrent transactions',
      'Test promo code discount calculations against edge cases (100% vouchers, expired codes)',
      'Confirm stock reservation counters never produce negative available inventory',
      'Generate initial cryptographic QR entry pass tokens for tickets'
    ]
  },
  {
    id: 'sprint-3',
    dates: '5 - 10 September 2026',
    title: 'Sprint 3: Integrations & Role Portals',
    focus: 'PayMe Africa webhooks, Textify Africa SMS, Resend emails, Strava sync, and Collectible Hub',
    status: 'Upcoming',
    deliverables: [
      {
        title: 'PayMe Africa Webhook & Idempotency Pipeline',
        details: 'Validates HMAC signatures, records payments, issues tickets, and prevents duplicate charges upon webhook retries.',
        done: false,
        module: 'Payments'
      },
      {
        title: 'Textify Africa & Resend Async Queue Worker',
        details: 'Dispatches Day 4/6 reservation reminders, ticket QR SMS, receipts, and event briefings with retry backoff.',
        done: false,
        module: 'Communications'
      },
      {
        title: 'Strava & Google Health Connect Sync Worker',
        details: 'OAuth flow for reading training distance and awarding milestone badges with strict location privacy protections.',
        done: false,
        module: 'Fitness & Gamification'
      },
      {
        title: 'Digital Collectible Engine & Public QR Verifier',
        details: 'Generates high-resolution PDF finisher certificates with tamper-proof public /verify/:hash authenticity endpoints.',
        done: false,
        module: 'Digital Collectibles'
      },
      {
        title: 'Volunteer, Sponsor & Partner Portals Backend',
        details: 'Gate check-in scanners for volunteers, logo/asset approvals for sponsors, and task approvals for partners.',
        done: false,
        module: 'Portals & Admin'
      }
    ],
    keyChecklist: [
      'Simulate 100+ concurrent PayMe webhook callbacks to guarantee zero duplicate orders',
      'Test Textify Africa SMS delivery to Vodacom, Tigo, Airtel, and Halotel test numbers',
      'Validate Resend PDF ticket attachments render cleanly on mobile email clients',
      'Verify that only users with role="admin" or role="volunteer" can execute ticket check-in'
    ]
  },
  {
    id: 'sprint-4',
    dates: '11 - 15 September 2026',
    title: 'Sprint 4: UAT, Hardening & Production Handoff',
    focus: 'User acceptance testing, load testing, security audits, and production deployment',
    status: 'Upcoming',
    deliverables: [
      {
        title: 'End-to-End User Acceptance Testing (UAT)',
        details: 'Complete end-to-end dry runs across all 15 user journeys (Discovery to Payment, Mixed Cart, Reservation Release, Portals).',
        done: false,
        module: 'Quality Assurance'
      },
      {
        title: 'Security & Penetration Audit',
        details: 'Audit against SQL injection, double-spend race conditions, RBAC bypasses, and webhook replay attacks.',
        done: false,
        module: 'Security Hardening'
      },
      {
        title: 'Production Deployment on Supabase & Vercel',
        details: 'Connect custom domain tourderotary.co.tz, configure production SSL, database connection pooler, and backup schedules.',
        done: false,
        module: 'DevOps & Launch'
      },
      {
        title: 'Production Handoff & Admin Training Gate',
        details: 'Deliver complete API documentation, admin credentials handover, and operational runbook by 15 September 2026 deadline.',
        done: false,
        module: 'Handoff Gate'
      }
    ],
    keyChecklist: [
      'Load test checkout endpoints at 200+ requests/second without database lock contention',
      'Verify automated daily database backups and point-in-time recovery on Supabase',
      'Conduct formal sign-off meeting with Rotary DSM organizers on 15 September 2026',
      'Activate pre-event phase monitoring'
    ]
  },
  {
    id: 'ops-phase',
    dates: '16 September - 30 November 2026',
    title: 'Operational Lifecycle: Pre-Event, Event Day & Post-Event M&E',
    focus: 'Live registrations, 1 November Event Day execution, and post-event impact reporting',
    status: 'Upcoming',
    deliverables: [
      {
        title: 'Pre-Event Phase Operations (16 Sept - 31 Oct)',
        details: 'Live registration monitoring, merchandise flash drops, sponsor onboarding, training leaderboards, and volunteer shift allocation.',
        done: false,
        module: 'Live Operations'
      },
      {
        title: 'Event Day Real-Time Execution (1 Nov 2026)',
        details: 'Phase Engine switch to event_day, gate QR pass check-ins, volunteer incident hotline, and live emergency SMS broadcasts.',
        done: false,
        module: 'Event Day Execution'
      },
      {
        title: 'Post-Event M&E, Financial Reconciliation & Annual Reset (2-30 Nov)',
        details: 'Phase Engine switch to post_event, revenue/attendance reconciliation, collectible certificate delivery, M&E report export, and annual reset cloning.',
        done: false,
        module: 'Post-Event M&E'
      }
    ],
    keyChecklist: [
      'Zero downtime throughout 1 November Event Day race operations',
      '100% financial balance reconciliation between PayMe Africa payouts and order ledgers',
      'Deliver final M&E impact summary and cancer-care fundraising totals to organizers',
      'Archive 2026 edition and prepare configuration template for 2027 edition'
    ]
  }
];
