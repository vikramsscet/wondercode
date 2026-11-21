import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import { createRoutes } from './routes/index.js';
import { createAIService } from './modules/ai/ai.service.js';
import { createAIProvider } from './providers/ai/registry.js';
import { createSupabaseAdmin, isSupabaseConfigured } from './config/supabase.js';

// Never log credentials or cookies.
export const createLogger = (config, destination) =>
  pino(
    {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    },
    destination,
  );

// `deps.supabase` lets tests inject a fake client.
export function createApp(config, logger = createLogger(config), deps = {}) {
  const app = express();
  app.locals.supabase =
    deps.supabase ?? (isSupabaseConfigured(config) ? createSupabaseAdmin(config) : null);
  // Feature code reaches AI only through app.locals.ai (provider chosen by AI_PROVIDER).
  app.locals.ai =
    deps.ai ??
    createAIService({
      provider: createAIProvider(config),
      config,
      supabase: app.locals.supabase,
      logger,
    });
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Non-browser clients send no Origin header; browsers must be allow-listed.
        if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new AppError(403, 'CORS_FORBIDDEN', 'Origin not allowed.'));
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1', createRoutes(config));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
