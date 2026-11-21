// Single place that reads build-time environment configuration.
const trimSlash = (value) => value.replace(/\/+$/, '');

export const env = {
  appUrl: trimSlash(import.meta.env.VITE_APP_URL || 'http://localhost:5173'),
  apiBaseUrl: trimSlash(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'),
  mode: import.meta.env.MODE,
};
