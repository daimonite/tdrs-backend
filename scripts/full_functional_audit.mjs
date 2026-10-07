/**
 * Full functional audit — every flow end-to-end against the live backend:
 *   auth (good/bad), RBAC, community content + validation, race fees,
 *   guest ticket purchase (both contracts), fail-closed webhook (unsigned,
 *   wrong-amount, valid), payment status, and per-IP rate limiting.
 * Cleans up every row it creates.
 *
 *   node scripts/full_functional_audit.mjs
 */
import 'dotenv/config';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const API = 'http://localhost:8800/api/v1';
const SUPA_URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SECRET = process.env.PAYME_WEBHOOK_SECRET;
const PHONE = '255700000001';

const svc = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });

let failures = 0;
const created = { postId: null, commentId: null, registrationId: null, orderId: null, ticketId: null };

function check(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!cond) failures++;
}

async function api(path, { method = 'GET', token = null, body = null, headers = {} } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  if (body !== null) h['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers: h, body: body !== null ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* empty body ok */ }
  return { status: res.status, json };
}

async function login(email, password) {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const j = await res.json().catch(() => ({}));
  return { status: res.status, token: j.access_token || null, uid: j.user?.id || null };
}

function signWebhook(payload) {
  return crypto.createHmac('sha256', SECRET).update(JSON.stringify(payload)).digest('hex');
}

console.log('== 1. HEALTH ==');
{
  const r = await api('/health');
  check('GET /health → 200 healthy', r.status === 200 && r.json?.status === 'healthy', `db ${r.json?.checks?.database?.latency_ms}ms`);
}

console.log('\n== 2. AUTH ==');
let pTok, hqTok, pUid;
{
  const bad = await login('participant@gmail.com', 'wrong-password');
  check('wrong password rejected (400)', bad.status === 400, `got ${bad.status}`);

  const unknown = await login(`nobody-${Date.now()}@gmail.com`, 'whatever1');
  check('unknown email rejected (400)', unknown.status === 400, `got ${unknown.status}`);

  const p = await login('participant@gmail.com', 'user1234');
  pTok = p.token; pUid = p.uid;
  check('participant@gmail.com login (200 + token)', p.status === 200 && !!p.token);

  const hq = await login('hqadmin@gmail.com', 'user1234');
  hqTok = hq.token;
  check('hqadmin@gmail.com login (200 + token)', hq.status === 200 && !!hq.token);
}

console.log('\n== 3. RBAC ==');
{
  const anon = await api('/admin/overview');
  check('admin route without token → 401', anon.status === 401, `got ${anon.status}`);

  const asP = await api('/admin/overview', { token: pTok });
  check('admin route as participant → 403', asP.status === 403, `got ${asP.status}`);

  const asHq = await api('/admin/overview', { token: hqTok });
  check('admin route as hq_admin → 200', asHq.status === 200, `got ${asHq.status}`);
}

console.log('\n== 4. COMMUNITY CONTENT ==');
{
  const list = await api('/community/posts?limit=5');
  check('GET /community/posts → 200 (paginated)', list.status === 200 && Array.isArray(list.json?.data ?? list.json?.posts));

  const created_res = await api('/community/posts', {
    method: 'POST', token: pTok,
    body: { content: `Functional audit probe ${Date.now()}`, post_type: 'training', discipline: 'run' }
  });
  created.postId = created_res.json?.post?.id || created_res.json?.data?.id || created_res.json?.id || null;
  check('POST /community/posts → 201', created_res.status === 201 && !!created.postId, `got ${created_res.status}`);

  const bogus = await api('/community/posts', {
    method: 'POST', token: pTok,
    body: { content: 'x', post_type: 'definitely-bogus-type' }
  });
  check('bogus post_type rejected (400)', bogus.status === 400, `got ${bogus.status}`);

  if (created.postId) {
    const react = await api(`/community/posts/${created.postId}/react`, { method: 'POST', token: pTok, body: { emoji: '👏' } });
    check('react to post → 200', react.status === 200, `got ${react.status}`);

    const c = await api(`/community/posts/${created.postId}/comments`, { method: 'POST', token: pTok, body: { content: 'audit comment' } });
    created.commentId = c.json?.comment?.id || c.json?.data?.id || c.json?.id || null;
    check('comment on post → 201', c.status === 201, `got ${c.status}`);

    const del = await api(`/community/posts/${created.postId}`, { method: 'DELETE', token: pTok });
    check('author deletes own post → 200', del.status === 200, `got ${del.status}`);
    created.postId = null; // deleted via API already
  }
}

console.log('\n== 5. RACE FEES (live DB vs frontend) ==');
{
  const r = await fetch(`${SUPA_URL}/rest/v1/race_categories?select=slug,entry_fee_tsh`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
  const cats = await r.json();
  const fee = (slug) => cats.find(c => c.slug === slug)?.entry_fee_tsh;
  check('sprint = 45,000', fee('sprint-individual') === 45000, `${fee('sprint-individual')}`);
  check('olympic = 75,000', fee('olympic-individual') === 75000, `${fee('olympic-individual')}`);
  check('relay = 90,000', fee('triathlon-relay') === 90000, `${fee('triathlon-relay')}`);
}

console.log('\n== 6. TICKET PURCHASE (guest contracts + webhook) ==');
let regId, orderNumber, orderId, regBib;
{
  // Canonical insert (exactly what PayStep.tsx does) — trigger creates the order.
  const ins = await fetch(`${SUPA_URL}/rest/v1/registrations`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${pTok}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: pUid, category: 'sprint', discipline: null, story: 'functional audit', payment_status: 'pending', status: 'pending' })
  });
  const reg = await ins.json().catch(() => []);
  regId = Array.isArray(reg) ? reg[0]?.id : reg?.id;
  check('registration insert (canonical shape) → 201', ins.status === 201 && !!regId, `got ${ins.status}`);
  created.registrationId = regId;

  const ordRes = await fetch(`${SUPA_URL}/rest/v1/orders?user_id=eq.${pUid}&order=created_at.desc&limit=1&select=id,order_number,total_tsh,status,source_registration_id`, { headers: { apikey: SVC, Authorization: `Bearer ${SVC}` } });
  const [order] = await ordRes.json();
  orderId = order?.id; orderNumber = order?.order_number;
  created.orderId = orderId;
  check('trigger auto-created order @ 45,000', order?.total_tsh === 45000, `${order?.order_number} total=${order?.total_tsh}`);
  check('order linked to source registration', order?.source_registration_id === regId);

  // Legacy contract (old frontend): {order_number, amount, phone}
  const legacy = await api('/payments/initiate', { method: 'POST', body: { order_number: orderNumber, amount: 45000, phone: PHONE } });
  check('legacy-contract initiate → 502 (PayMe key placeholder, order intact)', legacy.status === 502, `got ${legacy.status} ${legacy.json?.error?.slice(0, 60) || ''}`);

  // Canonical contract: {registrationId, amount, phone}
  const canonical = await api('/payments/initiate', { method: 'POST', body: { registrationId: regId, amount: 45000, phone: PHONE } });
  check('canonical-contract initiate → 502 (clear provider error)', canonical.status === 502 && /configured|unavailable/i.test(canonical.json?.error || ''), `got ${canonical.status}`);

  // Webhook — fail closed on missing signature
  const unsigned = await api('/payments/payme/webhook', {
    method: 'POST',
    body: { event_type: 'charge.completed', status: 'success', order_number: orderNumber, amount_tsh: 45000 }
  });
  check('unsigned webhook → 401 (fail closed)', unsigned.status === 401, `got ${unsigned.status}`);

  // Webhook — signed but wrong amount
  const badAmountPayload = { event_type: 'charge.completed', status: 'success', order_number: orderNumber, amount_tsh: 50000, payme_reference: 'AUDIT-BAD-AMT' };
  const badAmount = await api('/payments/payme/webhook', {
    method: 'POST', headers: { 'x-payme-signature': signWebhook(badAmountPayload) }, body: badAmountPayload
  });
  check('signed webhook with wrong amount → 400', badAmount.status === 400, `got ${badAmount.status}`);

  // Webhook — signed, correct amount → completes purchase
  const okPayload = { event_type: 'charge.completed', status: 'success', order_number: orderNumber, amount_tsh: 45000, payme_reference: `AUDIT-${Date.now()}`, phone_number: PHONE, provider: 'mpesa', idempotency_key: `audit-${Date.now()}` };
  const ok = await api('/payments/payme/webhook', {
    method: 'POST', headers: { 'x-payme-signature': signWebhook(okPayload) }, body: okPayload
  });
  check('valid signed webhook → 200 + ticket issued', ok.status === 200 && (ok.json?.tickets_issued?.length || 0) >= 1, `got ${ok.status} tickets=${ok.json?.tickets_issued?.length}`);

  // Verify DB state after webhook
  const t = await svc.from('tickets').select('id,bib_number,order_id').eq('order_id', orderId).maybeSingle();
  created.ticketId = t.data?.id || null;
  regBib = t.data?.bib_number;
  check('ticket row exists with bib', !!t.data?.bib_number, `bib=${regBib}`);

  const regAfter = await svc.from('registrations').select('status,payment_status,amount_tsh,bib_number').eq('id', regId).maybeSingle();
  check('registration confirmed + paid + bib stamped',
    regAfter.data?.status === 'confirmed' && regAfter.data?.payment_status === 'completed' && regAfter.data?.bib_number === regBib,
    `status=${regAfter.data?.status} pay=${regAfter.data?.payment_status}`);

  const ordAfter = await svc.from('orders').select('status').eq('id', orderId).maybeSingle();
  check('order marked paid', ordAfter.data?.status === 'paid', `status=${ordAfter.data?.status}`);

  const st = await api(`/payments/status/${orderNumber}`);
  check('GET /payments/status/:order → 200', st.status === 200, `got ${st.status}`);
}

console.log('\n== 7. RATE LIMITING (spoofed XFF — real IP bucket untouched) ==');
{
  // Fresh spoofed IP each run so the 10-per-15-min payment bucket is cold.
  const burstIp = `203.0.113.${Math.floor(Math.random() * 200) + 2}`;
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    const r = await api('/payments/retry', {
      method: 'POST',
      headers: { 'x-forwarded-for': burstIp },
      body: {}
    });
    statuses.push(r.status);
  }
  const hit429 = statuses.includes(429);
  const limited = statuses.slice(0, 10).every(s => s === 400);
  check('payment burst: 10×400 then 429 (per-IP limiter works)', hit429 && limited, `ip=${burstIp} ${statuses.join(',')}`);

  const other = await api('/payments/retry', { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.5' }, body: {} });
  check('different IP not rate-limited (per-IP isolation)', other.status !== 429, `got ${other.status}`);
}

console.log('\n== 8. CLEANUP ==');
{
  if (created.ticketId) await svc.from('tickets').delete().eq('id', created.ticketId);
  if (created.orderId) {
    await svc.from('payments').delete().eq('order_id', created.orderId);
    await svc.from('order_items').delete().eq('order_id', created.orderId);
    await svc.from('orders').delete().eq('id', created.orderId);
  }
  if (created.registrationId) await svc.from('registrations').delete().eq('id', created.registrationId);
  if (created.commentId) await svc.from('post_comments').delete().eq('id', created.commentId);
  console.log(`cleanup done (order ${created.orderId ? 'removed' : 'n/a'}, registration ${created.registrationId ? 'removed' : 'n/a'})`);
}

console.log('\n=========================================');
console.log(failures === 0 ? `ALL CHECKS PASSED` : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
