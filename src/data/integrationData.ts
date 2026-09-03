import { IntegrationGuide } from '../types';

export const INTEGRATION_GUIDES: IntegrationGuide[] = [
  {
    id: 'payme-africa',
    name: 'PayMe Africa Payment Gateway',
    provider: 'PayMe Africa / M-Pesa & Tigo Pesa Gateway',
    category: 'Payments',
    status: 'Ready for Implementation',
    summary: 'Handles all ticket registrations and merchandise checkout with Idempotency Key validation, automatic webhook verification, and payment recovery links.',
    authMethod: 'API Key + HMAC SHA-256 Webhook Signature',
    keyEndpointsOrEvents: [
      'POST /v1/checkout/session (Initiate transaction in TSh)',
      'Webhook: payment.success (Order paid, tickets generated)',
      'Webhook: payment.failed (Payment failure, triggers recovery link)',
      'POST /v1/refunds (Admin initiated refunds)'
    ],
    codeSample: {
      filename: 'src/services/paymeService.ts',
      language: 'typescript',
      code: `import crypto from 'crypto';
import { supabase } from '../config/supabase';

export class PayMeService {
  private secretKey = process.env.PAYME_SECRET_KEY!;

  /**
   * Verify HMAC-SHA256 signature from PayMe Africa webhook
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
    const computedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawBody)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signatureHeader)
    );
  }

  /**
   * Idempotent payment processing handler
   */
  async handlePaymentSuccess(payload: {
    order_number: string;
    idempotency_key: string;
    reference: string;
    amount: number;
    provider_channel: string;
  }) {
    // 1. Check if payment was already processed
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('idempotency_key', payload.idempotency_key)
      .single();

    if (existingPayment && existingPayment.status === 'success') {
      return { alreadyProcessed: true };
    }

    // 2. Begin ACID Transaction in PostgreSQL
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('order_number', payload.order_number)
      .select('id, user_id, total_tsh')
      .single();

    if (error || !order) throw new Error('Order not found');

    // 3. Record payment ledger entry
    await supabase.from('payments').insert({
      order_id: order.id,
      idempotency_key: payload.idempotency_key,
      payme_reference: payload.reference,
      provider_channel: payload.provider_channel,
      amount_tsh: payload.amount,
      status: 'success',
      paid_at: new Date().toISOString()
    });

    // 4. Generate tickets and dispatch SMS/Email
    await this.generateOrderTicketsAndDispatch(order.id, order.user_id);

    return { success: true };
  }
}`
    },
    bestPractices: [
      'Always use timingSafeEqual to avoid timing-attack vulnerabilities when validating webhook signatures.',
      'Pass a unique idempotency_key (e.g., idemp-tdr-2026-ord-UUID) on every checkout request.',
      'If payment fails, retain order in pending state for 48 hours to allow one-click retry from the participant account.'
    ],
    failureHandling: 'If the webhook fails to reach the server, PayMe retries with exponential backoff for 24 hours. The server responds with 200 OK only after DB transaction commits.'
  },
  {
    id: 'textify-africa',
    name: 'Textify Africa SMS Automation',
    provider: 'Textify Africa SMS Gateway',
    category: 'SMS',
    status: 'Ready for Implementation',
    summary: 'Automates critical Tanzanian mobile alerts: 7-day merchandise reservation reminders (Day 4 & Day 6), Day 7 release notices, ticket QR SMS, and Event Day morning briefings.',
    authMethod: 'Bearer Token + Sender ID ("ROTARY-DSM")',
    keyEndpointsOrEvents: [
      'POST /api/sms/send (Single & Bulk SMS dispatch)',
      'Template: RESERVATION_DAY4_REMINDER',
      'Template: RESERVATION_DAY6_FINAL_NOTICE',
      'Template: TICKET_CONFIRMATION_SMS',
      'Template: EVENT_DAY_START_BRIEFING'
    ],
    codeSample: {
      filename: 'src/services/smsService.ts',
      language: 'typescript',
      code: `export class SmsService {
  private apiUrl = 'https://api.textifyafrica.com/v1/sms/send';
  private apiKey = process.env.TEXTIFY_API_KEY!;
  private senderId = 'ROTARY-DSM';

  async sendReservationReminder(phone: string, name: string, daysRemaining: number, orderUrl: string) {
    const message = \`Jambo \${name}, your Tour de Rotary DSM merchandise reservation expires in \${daysRemaining} days. Complete payment to secure your official jersey: \${orderUrl}\`;
    
    return this.dispatchSms(phone, message, 'RESERVATION_REMINDER');
  }

  async sendTicketQrSms(phone: string, name: string, bib: string, activity: string) {
    const message = \`Hongera \${name}! Your Tour de Rotary 2026 registration for \${activity} is confirmed. Your BIB number is \${bib}. Show your QR pass at check-in.\`;
    
    return this.dispatchSms(phone, message, 'TICKET_CONFIRMATION');
  }

  private async dispatchSms(recipient: string, message: string, template: string) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender_id: this.senderId,
        recipient,
        message
      })
    });
    return response.json();
  }
}`
    },
    bestPractices: [
      'Ensure phone numbers are normalized to E.164 Tanzanian standard (+2557XXXXXXXX or +2556XXXXXXXX).',
      'Keep SMS body under 160 characters when possible to optimize messaging costs.',
      'Queue messages in communication_queue table rather than executing synchronous network calls in user request threads.'
    ],
    failureHandling: 'Failed SMS messages are automatically retried up to 3 times before logging an operational alert in the HQ Command Centre.'
  },
  {
    id: 'resend-email',
    name: 'Resend Transactional Email Delivery',
    provider: 'Resend API',
    category: 'Email',
    status: 'Ready for Implementation',
    summary: 'Delivers high-deliverability HTML mixed-cart receipts, attached printable PDF event tickets, digital collectible certificates, and post-event gratitude newsletters.',
    authMethod: 'Resend API Key',
    keyEndpointsOrEvents: [
      'POST /emails (Send transactional email with PDF attachment)',
      'Template: MIXED_CART_RECEIPT',
      'Template: PDF_TICKET_DELIVERY',
      'Template: POST_EVENT_CERTIFICATE'
    ],
    codeSample: {
      filename: 'src/services/emailService.ts',
      language: 'typescript',
      code: `import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTicketEmail(toEmail: string, participantName: string, ticketPdfBuffer: Buffer) {
  return await resend.emails.send({
    from: 'Tour de Rotary DSM <tickets@tourderotary.co.tz>',
    to: toEmail,
    subject: 'Your Tour de Rotary DSM 2026 Ticket & QR Entry Pass',
    html: \`
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2 style="color: #0F172A;">Jambo \${participantName},</h2>
        <p>Thank you for registering for <strong>Tour de Rotary Dar es Salaam 2026</strong> in support of cancer care.</p>
        <p>Attached to this email is your official Ticket with your Gate QR Pass.</p>
        <div style="background: #F1F5F9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Event Date: Sunday, 1 November 2026</p>
          <p style="margin: 0;">Venue: Dar es Salaam Yacht Club</p>
        </div>
      </div>
    \`,
    attachments: [
      {
        filename: 'TourDeRotary_Ticket.pdf',
        content: ticketPdfBuffer
      }
    ]
  });
}`
    },
    bestPractices: [
      'Include DKIM, SPF, and DMARC verification on tourderotary.co.tz domain to maintain 99%+ inbox placement.',
      'Generate PDF tickets server-side using pdf-lib or Puppeteer and stream buffer directly to Resend attachment.'
    ],
    failureHandling: 'Webhooks from Resend listen for bounces and spam complaints, updating communication_queue to prevent re-sending to invalid mailboxes.'
  },
  {
    id: 'strava-health-connect',
    name: 'Strava & Google Health Connect Integration',
    provider: 'Strava API (v3) & Health Connect',
    category: 'Fitness',
    status: 'Ready for Implementation',
    summary: 'Reads athlete training distance, streaks, and training frequency via OAuth. Automatically unlocks milestone badges while strictly protecting user location privacy.',
    authMethod: 'OAuth 2.0 (activity:read_all scope)',
    keyEndpointsOrEvents: [
      'GET /oauth/authorize (Strava OAuth Consent screen)',
      'POST /oauth/token (Exchange auth code for access/refresh token)',
      'GET /api/v3/athlete/activities (Read training distance & dates)'
    ],
    codeSample: {
      filename: 'src/services/stravaService.ts',
      language: 'typescript',
      code: `export class StravaService {
  /**
   * Syncs training distance with strict privacy data minimization
   */
  async syncParticipantTraining(userId: string, accessToken: string) {
    const afterTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 3600); // Past 7 days
    
    const response = await fetch(
      \`https://www.strava.com/api/v3/athlete/activities?after=\${afterTimestamp}&per_page=30\`,
      { headers: { Authorization: \`Bearer \${accessToken}\` } }
    );
    
    const activities = await response.json();
    
    // Calculate aggregate distance (meters -> km)
    const totalDistanceMeters = activities.reduce((sum: number, act: any) => sum + (act.distance || 0), 0);
    const totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(2));
    const trainingDaysCount = new Set(activities.map((act: any) => act.start_date_local.substring(0, 10))).size;

    // PRIVACY SAFEGUARD: Store ONLY aggregates and milestone badges. Do NOT store raw GPS coordinates!
    return {
      totalDistanceKm,
      trainingDaysCount,
      eligibleFor50KmBadge: totalDistanceKm >= 50
    };
  }
}`
    },
    bestPractices: [
      'Data Minimization: Never store raw GPS track logs, polyline routes, or start/finish coordinates.',
      'Allow participants to disconnect fitness integrations and revoke OAuth tokens at any time from their profile.',
      'Default friends leaderboard sharing to opt-in badge milestones only.'
    ],
    failureHandling: 'If an OAuth token expires, use the refresh_token to seamlessly re-authenticate without forcing the user to log in again.'
  },
  {
    id: 'digital-collectibles',
    name: 'Digital Collectibles & NFT Hub',
    provider: 'Internal Certificate Engine + Web3 Provider Layer',
    category: 'Collectibles',
    status: 'Ready for Implementation',
    summary: 'Generates high-resolution participation certificates with QR verification, public authenticity pages, and optional on-chain NFT minting for sponsor/patron editions.',
    authMethod: 'Cryptographic SHA-256 Hash + Smart Contract Signer',
    keyEndpointsOrEvents: [
      'POST /api/v1/collectibles/generate (Issue certificate post-event)',
      'GET /api/v1/verify/collectible/:serialOrHash (Public verification page)',
      'POST /api/v1/collectibles/mint-nft (Optional on-chain Polygon mint)'
    ],
    codeSample: {
      filename: 'src/services/collectibleService.ts',
      language: 'typescript',
      code: `import crypto from 'crypto';

export function generateCollectibleRecord(userId: string, editionYear: number, activity: string, bib: string) {
  const serial = \`TDR-\${editionYear}-FINISHER-\${bib}\`;
  
  // Create immutable cryptographic verification hash
  const hashPayload = \`\${serial}:\${userId}:\${activity}:\${editionYear}:ROTARY_SECRET\`;
  const verificationHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

  const metadataJson = {
    name: \`Tour de Rotary DSM \${editionYear} Finisher - \${activity}\`,
    description: \`Official proof of completion for \${activity} in support of cancer care.\`,
    attributes: [
      { trait_type: 'Edition', value: String(editionYear) },
      { trait_type: 'Activity', value: activity },
      { trait_type: 'BIB Number', value: bib },
      { trait_type: 'Cause', value: 'Rotary Cancer Care Initiative' }
    ]
  };

  return {
    serial,
    verificationHash,
    verificationUrl: \`https://tourderotary.co.tz/verify/\${verificationHash}\`,
    metadataJson
  };
}`
    },
    bestPractices: [
      'Standard certificates must remain 100% wallet-light and require no cryptocurrency knowledge from participants.',
      'Public verification pages must render instantly without authentication so sponsors and participants can share certificates on LinkedIn/Twitter.',
      'PDF certificates must be pre-rendered and stored in Supabase Storage with CDN caching.'
    ],
    failureHandling: 'If an on-chain mint fails due to gas or provider timeouts, the standard verified PDF remains accessible immediately while minting is retried in the background.'
  }
];
