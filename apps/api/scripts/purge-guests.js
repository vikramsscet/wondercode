// Deletes expired guest sessions (and, by cascade, their projects). Run on a schedule.
// Usage: npm run purge:guests -w apps/api
import { loadConfig } from '../src/config/env.js';
import { createSupabaseAdmin, isSupabaseConfigured } from '../src/config/supabase.js';
import { purgeExpiredGuests } from '../src/modules/guests/guests.service.js';

const config = loadConfig();
if (!isSupabaseConfigured(config)) {
  console.error('FAIL: Supabase is not configured.');
  process.exit(1);
}
const removed = await purgeExpiredGuests(createSupabaseAdmin(config));
console.log(`OK: removed ${removed} expired guest session(s)`);
