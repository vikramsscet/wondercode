// Single place that reads build-time environment configuration.
const trimSlash = (value) => value.replace(/\/+$/, '');

export const env = {
  appUrl: trimSlash(import.meta.env.VITE_APP_URL || 'http://localhost:5173'),
  apiBaseUrl: trimSlash(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  mode: import.meta.env.MODE,
};
