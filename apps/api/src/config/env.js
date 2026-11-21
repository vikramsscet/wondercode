// Reads and validates environment configuration once, at startup.
export function loadConfig(source = process.env) {
  const port = Number(source.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${source.PORT}`);
  }
  return {
    nodeEnv: source.NODE_ENV || 'development',
    port,
    corsOrigins: (source.CORS_ORIGINS || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    logLevel: source.LOG_LEVEL || 'info',
    supabase: {
      url: source.SUPABASE_URL || '',
      serviceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  };
}
