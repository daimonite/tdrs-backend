#!/usr/bin/env node
/**
 * One-off: apply a single migration file via the exec_sql RPC,
 * bypassing the ledger's dependency on running all pending files in order.
 * Usage: node scripts/apply-one.mjs migrations/019_canonical_frontend_contract.sql
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/apply-one.mjs <migration.sql>'); process.exit(1); }

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = readFileSync(file, 'utf8');

const { error } = await supabase.rpc('exec_sql', { query: sql });
if (error) {
  console.error(`FAILED ${file}:`, error.message);
  process.exit(1);
}
console.log(`OK ${file}`);

// Record it so the ledger doesn't try to re-run it later.
const { error: recErr } = await supabase
  .from('schema_migrations')
  .upsert({ filename: file.split('/').pop(), success: true }, { onConflict: 'filename' });
if (recErr) console.warn('warn: could not record in ledger:', recErr.message);
else console.log('ledger updated');
