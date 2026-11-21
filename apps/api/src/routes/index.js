import { Router } from 'express';
import health from './health.js';
import children from '../modules/children/children.routes.js';
import { createGuestRouter } from '../modules/guests/guests.routes.js';
import auth from '../modules/auth/auth.routes.js';

// Mounted at /api/v1. Feature routers are added here by later prompts.
export function createRoutes(config) {
  const router = Router();
  router.use('/health', health);
  router.use('/auth/guest-session', createGuestRouter(config));
  router.use('/auth', auth);
  router.use('/children', children);
  return router;
}
