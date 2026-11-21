import { AppError } from '../utils/AppError.js';

// Verifies the Supabase access token on protected routes and sets req.auth = { userId, email }.
// Verification goes to Supabase Auth, so expired, revoked or forged tokens are rejected.
export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(header);
    if (!match) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');

    const supabase = req.app.locals.supabase;
    if (!supabase)
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Sign-in is not available right now.');

    const { data, error } = await supabase.auth.getUser(match[1]);
    if (error || !data?.user) {
      // Distinguish a bad token (4xx from Supabase) from an outage.
      if (error && (!error.status || error.status >= 500)) {
        throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Sign-in is not available right now.');
      }
      throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in again.');
    }
    req.auth = { userId: data.user.id, email: data.user.email ?? null };
    return next();
  } catch (err) {
    return next(err);
  }
}
