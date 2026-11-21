import { loadConfig } from './config/env.js';
import { createApp, createLogger } from './app.js';

const config = loadConfig();
const logger = createLogger(config);
const server = createApp(config, logger).listen(config.port, () => {
  logger.info(`WonderCode API listening on port ${config.port}`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
