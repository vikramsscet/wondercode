// Reads and validates environment configuration once, at startup.
const positiveInt = (source, name, fallback) => {
  const value = Number(source[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${name}: ${source[name]}`);
  return value;
};

export const AI_PROVIDER_NAMES = ['mock', 'openai', 'gemini', 'anthropic'];

const nonNegativeInt = (source, name, fallback) => {
  const value = Number(source[name] ?? fallback);
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${name}: ${source[name]}`);
  return value;
};

export function loadConfig(source = process.env) {
  const aiProvider = source.AI_PROVIDER || 'mock';
  if (!AI_PROVIDER_NAMES.includes(aiProvider)) {
    throw new Error(
      `Invalid AI_PROVIDER: ${aiProvider}. Use one of: ${AI_PROVIDER_NAMES.join(', ')}`,
    );
  }
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
    ai: {
      provider: aiProvider,
      model: source.AI_MODEL || '',
      timeoutMs: positiveInt(source, 'AI_TIMEOUT_MS', 30000),
      maxRetries: nonNegativeInt(source, 'AI_MAX_RETRIES', 2),
      retryBaseMs: nonNegativeInt(source, 'AI_RETRY_BASE_MS', 250),
    },
    guest: {
      ttlMinutes: positiveInt(source, 'GUEST_TTL_MINUTES', 120),
      maxProjects: positiveInt(source, 'GUEST_MAX_PROJECTS', 2),
      usageLimit: positiveInt(source, 'GUEST_USAGE_LIMIT', 10),
      sessionsPerIpPerHour: positiveInt(source, 'GUEST_SESSIONS_PER_IP_PER_HOUR', 10),
    },
    teacher: {
      dailyLimitChild: positiveInt(source, 'TEACHER_DAILY_LIMIT_CHILD', 50),
      dailyLimitGuest: positiveInt(source, 'TEACHER_DAILY_LIMIT_GUEST', 10),
      retentionDays: positiveInt(source, 'TEACHER_RETENTION_DAYS', 30),
    },
    supabase: {
      url: source.SUPABASE_URL || '',
      serviceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY || '',
    },
  };
}
