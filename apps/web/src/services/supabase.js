import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// Browser client: anon/publishable key only. Never the service-role key.
export const isAuthConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const supabase = isAuthConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
