import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const supabaseUrl = process.env.SUPABASE_URL ;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY ;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing. Some database operations may fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export default supabase;
