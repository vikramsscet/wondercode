import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import * as repo from './guests.repository.js';

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

// The token has 256 bits of entropy, so a plain SHA-256 is sufficient (no salt/slow hash needed).
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const toGuest = (row, config) => ({
  id: row.id,
  expiresAt: row.expires_at,
  limits: { maxProjects: config.guest.maxProjects, usageLimit: row.usage_limit },
});

export async function createGuestSession(supabase, config, now = new Date()) {
  const token = randomBytes(32).toString('base64url');
  const row = await repo.insertGuest(supabase, {
    session_token_hash: hashToken(token),
    usage_limit: config.guest.usageLimit,
    expires_at: new Date(now.getTime() + config.guest.ttlMinutes * 60_000).toISOString(),
  });
  // The raw token is returned exactly once and never stored.
  return { token, ...toGuest(row, config) };
}

// Resolves a presented token to an active guest session, or throws 401.
export async function authenticateGuest(supabase, config, token, now = new Date()) {
  if (!token || !TOKEN_PATTERN.test(token)) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Guest session not found.');
  }
  const row = await repo.findGuestByTokenHash(supabase, hashToken(token));
  if (!row || row.status !== 'active') {
    throw new AppError(401, 'UNAUTHENTICATED', 'Guest session not found.');
  }
  if (new Date(row.expires_at) <= now) {
    throw new AppError(
      401,
      'GUEST_SESSION_EXPIRED',
      'Your guest session has ended. Start a new one!',
    );
  }
  return toGuest(row, config);
}

export const endGuestSession = (supabase, guestId) => repo.deleteGuest(supabase, guestId);

// To be called before creating a guest project (project endpoints arrive in a later prompt).
export async function assertGuestProjectQuota(supabase, config, guestId) {
  if ((await repo.countGuestProjects(supabase, guestId)) >= config.guest.maxProjects) {
    throw new AppError(
      409,
      'GUEST_LIMIT_REACHED',
      'Guests can make a few projects. Ask a parent to create an account to keep building!',
    );
  }
}

export async function purgeExpiredGuests(supabase, now = new Date()) {
  return (await repo.deleteExpiredGuests(supabase, now.toISOString())).length;
}
