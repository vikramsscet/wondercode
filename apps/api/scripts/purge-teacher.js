// Deletes expired teacher messages and idle conversations (retention). Run on a schedule.
// Usage: npm run purge:teacher -w apps/api
import { loadConfig } from '../src/config/env.js';
import { createSupabaseAdmin, isSupabaseConfigured } from '../src/config/supabase.js';
import { purgeExpiredTeacherData } from '../src/modules/teacher/teacher.service.js';

const config = loadConfig();
if (!isSupabaseConfigured(config)) {
  console.error('FAIL: Supabase is not configured.');
  process.exit(1);
}
const result = await purgeExpiredTeacherData(
  createSupabaseAdmin(config),
  config.teacher.retentionDays,
);
console.log(
  `OK: removed ${result.messages} expired message(s) and ${result.conversations} idle chat(s)`,
);
