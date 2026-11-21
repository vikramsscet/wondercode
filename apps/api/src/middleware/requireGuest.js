import { AppError } from '../utils/AppError.js';
import { authenticateGuest } from '../modules/guests/guests.service.js';

// Guard for guest-only routes: reads X-Guest-Token and sets req.guest.
// Parent JWTs are never accepted here, and guest tokens are never accepted by requireAuth.
export const requireGuest = (config) => async (req, res, next) => {
  try {
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Guest sessions are not available right now.');
    }
    req.guest = await authenticateGuest(supabase, config, req.get('x-guest-token'));
    next();
  } catch (err) {
    next(err);
  }
};
