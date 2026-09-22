import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ── Probe via REST: does the table exist and which columns select cleanly? ──
async function probeTable(name, cols) {
  const { data, error } = await supabase.from(name).select(cols).limit(0);
  return { table: name, ok: !error, error: error ? `${error.code} ${error.message}` : null, cols };
}

const probes = [
  ['registrations', 'id, user_id, activity_slug, status, payment_status, amount_tsh, bib_number, category, discipline, story, story_public, payment_ref'],
  ['posts', 'id'],
  ['community_posts', 'id, user_id, post_type, discipline, content, status'],
  ['post_reactions', 'post_id, user_id, emoji, reaction_type'],
  ['post_comments', 'id, post_id, user_id, content'],
  ['fundraising_campaigns', 'id, participant_id, slug, goal, created_at'],
  ['donations', 'id, campaign_id, donor_name, donor_email, amount, message, payment_status, payme_reference'],
  ['profiles', 'id, auth_user_id, full_name, email, phone, role, avatar_url'],
  ['event_config', 'phase, lifecycle_state, event_date'],
  ['race_categories', 'slug, name, entry_fee_tsh'],
];

for (const [t, c] of probes) {
  const r = await probeTable(t, c);
  console.log(`${r.ok ? 'OK  ' : 'MISS'} ${t.padEnd(22)} ${r.ok ? '' : r.error}`);
}

// ── Check registration CHECK constraints by attempting a probe insert in a txn ──
// (skipped: would write data; CHECK enum values instead read from 001/legacy docs)

// ── Payments table + count sanity ──
const { count: regCount } = await supabase.from('registrations').select('id', { count: 'exact', head: true });
console.log('registrations row count:', regCount);
