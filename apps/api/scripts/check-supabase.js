// Usage: npm run check:supabase -w apps/api
import { loadConfig } from '../src/config/env.js';
import { createSupabaseAdmin, isSupabaseConfigured } from '../src/config/supabase.js';
import { checkSupabaseConnection } from '../src/services/supabaseHealth.js';

const config = loadConfig();
if (!isSupabaseConfigured(config)) {
  console.error('FAIL: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY missing in apps/api/.env');
  process.exit(1);
}
const host = new URL(config.supabase.url).host;
const result = await checkSupabaseConnection(createSupabaseAdmin(config));
if (result.ok) {
  console.log(`OK: connected to Supabase (${host})`);
} else {
  console.error(`FAIL: ${result.reason} (${host})`);
  process.exit(1);
}
