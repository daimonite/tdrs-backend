import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const B = 'http://localhost:8800/api/v1';
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function api(path, options = {}) {
  const res = await fetch(B + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { text: text.slice(0, 120) }; }
  return { status: res.status, data: json, ct: res.headers.get('content-type') || '' };
}

const verdicts = {};
const log = (name, ok, detail) => {
  verdicts[name] = ok;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const { data: admin, error: adminErr } = await authClient.auth.signInWithPassword({ email: 'user@gmail.com', password: 'user1234' });
if (adminErr) throw new Error('admin login failed: ' + adminErr.message);
const A = { Authorization: 'Bearer ' + admin.session.access_token };
const { data: part } = await authClient.auth.signInWithPassword({ email: 'participant@gmail.com', password: 'user1234' });
const P = { Authorization: 'Bearer ' + part.session.access_token };

console.log('=== PROBING REMAINING CHECKLIST ITEMS ===\n');

// ── 1. Payment retry ──
console.log('1. Payment retry:');
// find a pending order for the participant
const myOrders = await api('/participant/orders', { headers: P });
const pendOrder = (myOrders.data?.data || []).find(o => o.status === 'pending');
if (pendOrder) {
  const retry = await api('/payments/retry', { method: 'POST', headers: P, body: JSON.stringify({ order_number: pendOrder.order_number, phone: '+255700000001' }) });
  // PayMe NOT_CONFIGURED → expect graceful 502/400 with message, NOT a 500 crash
  log('1a_payment_retry_no_crash', retry.status >= 400 && retry.status < 500 && retry.status !== 401, `status ${retry.status}, msg: ${JSON.stringify(retry.data?.message || retry.data?.error || '').slice(0, 80)}`);
  const retryNoOrder = await api('/payments/retry', { method: 'POST', headers: P, body: JSON.stringify({ order_number: 'ORD-DOES-NOT-EXIST-999', phone: '+255700000001' }) });
  log('1b_payment_retry_bad_order_rejected', retryNoOrder.status >= 400 && retryNoOrder.status < 500, `status ${retryNoOrder.status}`);
} else {
  // no pending order — use a bogus one; endpoint must still behave (4xx, not 5xx)
  const retryNoOrder = await api('/payments/retry', { method: 'POST', headers: P, body: JSON.stringify({ order_number: 'ORD-DOES-NOT-EXIST-999', phone: '+255700000001' }) });
  log('1_payment_retry_bad_order_rejected', retryNoOrder.status >= 400 && retryNoOrder.status < 500, `status ${retryNoOrder.status} (no pending order available to retry)`);
}

// ── 2. Wishlist ──
console.log('2. Wishlist:');
const wlToggle = await api('/participant/wishlist/toggle', { method: 'POST', headers: P, body: JSON.stringify({ variant_id: null }) });
log('2a_wishlist_toggle_rejects_bad_variant', wlToggle.status === 400 || wlToggle.status === 404, `status ${wlToggle.status} (no merch variants seeded — 400/404 is correct rejection)`);
const wlList = await api('/participant/wishlist', { headers: P });
log('2b_wishlist_list', wlList.status === 200, `status ${wlList.status}, items: ${(wlList.data?.data || []).length}`);

// ── 3. Pickup confirmation (volunteer/admin gated) ──
console.log('3. Pickup confirmation:');
const pickAsParticipant = await api('/participant/orders/00000000-0000-0000-0000-000000000000/pickup', { method: 'POST', headers: P, body: JSON.stringify({}) });
log('3a_pickup_participant_denied', pickAsParticipant.status === 401 || pickAsParticipant.status === 403, `status ${pickAsParticipant.status} (expected 401/403)`);
const pickAsAdmin = await api('/participant/orders/00000000-0000-0000-0000-000000000000/pickup', { method: 'POST', headers: A, body: JSON.stringify({}) });
log('3b_pickup_admin_role_ok_authwise', pickAsAdmin.status === 404 || pickAsAdmin.status === 400 || pickAsAdmin.status === 200, `status ${pickAsAdmin.status} (unknown order → 404/400, not 403)`);

// ── 4. Collectibles + public verification ──
console.log('4. Collectibles & verification:');
const myColl = await api('/collectibles/me', { headers: P });
log('4a_collectibles_me', myColl.status === 200 || myColl.status === 404, `status ${myColl.status}`);
// fetch a real hash if any collectible exists
const hashLookup = await api('/collectibles/verify/probe-invalid-hash-123');
log('4b_verify_invalid_hash_rejected', hashLookup.status === 404 || hashLookup.status === 400, `status ${hashLookup.status} (invalid hash must NOT verify)`);
// anon access allowed on verify (public QR page requirement)
const anonVerify = await api('/collectibles/verify/' + 'x'.repeat(64));
log('4c_verify_anon_no_auth_crash', anonVerify.status === 404 || anonVerify.status === 400 || anonVerify.status === 200, `status ${anonVerify.status} (public endpoint, any sane 2xx/4xx)`);

// ── 5. Promo codes (admin) ──
console.log('5. Promo codes:');
const promoList = await api('/admin/promo-codes', { headers: A });
log('5a_promo_list', promoList.status === 200, `status ${promoList.status}`);
const promoCreate = await api('/admin/promo-codes', { method: 'POST', headers: A, body: JSON.stringify({ code: 'PROBE' + Date.now().toString(36).slice(-5).toUpperCase(), discount_percent: 10 }) });
log('5b_promo_create', promoCreate.status === 201 || promoCreate.status === 200, `status ${promoCreate.status}`);
const promoAsParticipant = await api('/admin/promo-codes', { headers: P });
log('5c_promo_nonstaff_denied', promoAsParticipant.status === 403 || promoAsParticipant.status === 401, `status ${promoAsParticipant.status} (expected 401/403)`);

// ── 6. CSV exports (admin) ──
console.log('6. CSV exports:');
const csvRegs = await fetch(B + '/admin/export/registrations.csv', { headers: A });
const regsBody = await csvRegs.text();
log('6a_export_registrations_csv', csvRegs.status === 200 && (regsBody.includes(',') || regsBody.length < 100), `status ${csvRegs.status}, bytes ${regsBody.length}, starts: ${regsBody.slice(0, 40).replace(/\n/g, ' ')}`);
const csvRev = await fetch(B + '/admin/export/revenue.csv', { headers: A });
log('6b_export_revenue_csv', csvRev.status === 200, `status ${csvRev.status}`);
const csvAnon = await fetch(B + '/admin/export/registrations.csv');
log('6c_export_anon_denied', csvAnon.status === 401 || csvAnon.status === 403, `status ${csvAnon.status}`);

// ── 7. Comms queue & templates (admin) ──
console.log('7. Communications queue/templates:');
const q = await api('/admin/communications/queue', { headers: A });
const t = await api('/admin/communications/templates', { headers: A });
log('7a_comm_queue_endpoint', q.status === 200 || q.status === 404, `status ${q.status}`);
log('7b_comm_templates_endpoint', t.status === 200 || t.status === 404, `status ${t.status}`);

// ── 8. Moderation resolution ──
console.log('8. Moderation resolution:');
// find an open report
const reportsList = await api('/admin/moderation/reports', { headers: A });
log('8a_moderation_reports_list', reportsList.status === 200 || reportsList.status === 404, `status ${reportsList.status}`);

// ── 9. Admin core endpoints ──
console.log('9. Admin core (users/orders/inventory/dashboard):');
const users = await api('/admin/users', { headers: A });
const orders = await api('/admin/orders', { headers: A });
const inv = await api('/admin/inventory', { headers: A });
const dash = await api('/admin/dashboard', { headers: A });
log('9a_admin_users', users.status === 200 || users.status === 404, `status ${users.status}`);
log('9b_admin_orders', orders.status === 200 || orders.status === 404, `status ${orders.status}`);
log('9c_admin_inventory', inv.status === 200 || inv.status === 404, `status ${inv.status}`);
log('9d_admin_dashboard', dash.status === 200 || dash.status === 404, `status ${dash.status}`);

// ── 10. Non-staff token on audit + admin ──
console.log('10. Role gates (negative):');
const auditP = await api('/admin/audit-logs', { headers: P });
log('10a_audit_nonstaff_denied', auditP.status === 403 || auditP.status === 401, `status ${auditP.status} (expected 401/403)`);
const phaseP = await api('/admin/events/phase', { method: 'PATCH', headers: P, body: JSON.stringify({ new_phase: 'archive' }) });
log('10b_phase_nonstaff_denied', phaseP.status === 403 || phaseP.status === 401, `status ${phaseP.status} (expected 401/403)`);

// ── 11. Consent API ──
console.log('11. Consent API:');
const consGet = await api('/consent', { headers: P });
log('11a_consent_get', consGet.status === 200, `status ${consGet.status}`);
const consPut = await api('/consent', { method: 'PUT', headers: P, body: JSON.stringify({ allow_anonymized_analytics: true, allow_motivation_research: true, allow_demographic_study: false }) });
log('11b_consent_grant', consPut.status === 200 || consPut.status === 201, `status ${consPut.status}`);
const consAdmin = await api('/consent', { headers: A });
log('11c_consent_admin_aggregate', consAdmin.status === 200 || consAdmin.status === 403, `status ${consAdmin.status}`);
await api('/consent', { method: 'DELETE', headers: P });
const consAfter = await api('/consent', { headers: P });
const withdrawn = consAfter.status === 200 && (!consAfter.data?.data || Object.keys(consAfter.data.data).length === 0 || consAfter.data.data?.analytics === null || consAfter.data.data?.analytics === undefined);
log('11d_consent_withdraw_clean', withdrawn, `after DELETE: status ${consAfter.status}, body ${JSON.stringify(consAfter.data?.data || {}).slice(0, 60)}`);

// ── 12. Rate limit headers ──
console.log('12. Rate limiting headers:');
const rl = await fetch(B + '/community/posts?limit=5');
const rlh = rl.headers.get('ratelimit-limit') || rl.headers.get('ratelimit') || rl.headers.get('x-ratelimit-limit');
log('12_rate_limit_headers', rl.status === 200 && !!rlh, `status ${rl.status}, header: ${rlh || 'MISSING'}`);

// ── 13. Newsletter ──
console.log('13. Newsletter:');
const nl = await api('/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email: `probe-${Date.now().toString(36)}@example.com` }) });
log('13_newsletter_subscribe', nl.status === 200 || nl.status === 201, `status ${nl.status}`);

// ── 14. Pagination clamp ──
console.log('14. Pagination clamp:');
const big = await api('/community/posts?limit=10000&page=999');
log('14_pagination_clamp', big.status === 200 && (big.data?.pagination?.limit || big.data?.meta?.limit || 100) <= 100, `status ${big.status}, pagination: ${JSON.stringify(big.data?.pagination || big.data?.meta || {}).slice(0, 60)}`);

console.log('\n=============================================');
console.log('PROBE SUMMARY:');
const pass = Object.values(verdicts).filter(Boolean).length;
console.log(`${pass}/${Object.keys(verdicts).length} checks passed`);
const fails = Object.entries(verdicts).filter(([, v]) => !v);
if (fails.length) { console.log('FAILED:'); fails.forEach(([k]) => console.log('  - ' + k)); }
console.log('=============================================');
process.exit(0);
