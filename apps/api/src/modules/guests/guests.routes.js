import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { requireGuest } from '../../middleware/requireGuest.js';
import { AppError } from '../../utils/AppError.js';
import { sendSuccess } from '../../utils/response.js';
import * as service from './guests.service.js';

// Mounted at /auth/guest-session
export function createGuestRouter(config) {
  const router = Router();
  const guard = requireGuest(config);

  // Limits how many sessions one IP can start (behind a proxy, configure `trust proxy`).
  const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.guest.sessionsPerIpPerHour,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new AppError(429, 'RATE_LIMITED', 'Too many guest sessions. Please try again later.')),
  });

  const handler = (fn) => async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (err) {
      next(err);
    }
  };

  router.post(
    '/',
    createLimiter,
    handler(async (req, res) => {
      const supabase = req.app.locals.supabase;
      if (!supabase) {
        throw new AppError(
          503,
          'SERVICE_UNAVAILABLE',
          'Guest sessions are not available right now.',
        );
      }
      sendSuccess(req, res, await service.createGuestSession(supabase, config), { status: 201 });
    }),
  );

  router.get('/', guard, (req, res) => sendSuccess(req, res, req.guest));

  router.delete(
    '/',
    guard,
    handler(async (req, res) => {
      await service.endGuestSession(req.app.locals.supabase, req.guest.id);
      sendSuccess(req, res, { ended: true });
    }),
  );

  return router;
}
