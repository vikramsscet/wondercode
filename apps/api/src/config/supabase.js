import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = (config) =>
  Boolean(config.supabase.url && config.supabase.serviceRoleKey);

// Server-side admin client (service-role key bypasses RLS). Never expose it to the browser.
// Authorization must be enforced in our services; do not pass this client to request handlers directly.
export function createSupabaseAdmin(config) {
  const { url, serviceRoleKey } = config.supabase;
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  try {
    new URL(url);
  } catch {
    throw new Error('SUPABASE_URL is not a valid URL.');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
