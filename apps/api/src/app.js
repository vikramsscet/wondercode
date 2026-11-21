import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { requestId } from './middleware/requestId.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/AppError.js';
import routes from './routes/index.js';

// Never log credentials or cookies.
export const createLogger = (config, destination) =>
  pino(
    {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    },
    destination,
  );

export function createApp(config, logger = createLogger(config)) {
  const app = express();
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

  app.use('/api/v1', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
