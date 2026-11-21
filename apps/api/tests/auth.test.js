import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

const config = loadConfig({});
const UID = '123e4567-e89b-42d3-a456-426614174000';

function fakeSupabase({
  user = { id: UID, email: 'p@example.com' },
  authError = null,
  profile,
} = {}) {
  const row =
    profile === undefined
      ? { id: UID, display_name: 'Pat', ui_language: 'en', created_at: '2026-01-01T00:00:00Z' }
      : profile;
  return {
    auth: {
      getUser: async (token) =>
        token === 'good.token'
          ? { data: { user }, error: authError }
          : { data: { user: null }, error: authError ?? { status: 401 } },
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    }),
  };
}
const appWith = (supabase) => createApp(config, pino({ level: 'silent' }), { supabase });

describe('GET /api/v1/auth/me', () => {
  it('rejects a missing token', async () => {
    const res = await request(appWith(fakeSupabase())).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects malformed headers and bad tokens', async () => {
    const app = appWith(fakeSupabase());
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Basic abc')).status,
    ).toBe(401);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer bad.token')).status,
    ).toBe(401);
  });

  it('returns the parent context for a valid token', async () => {
    const res = await request(appWith(fakeSupabase()))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer good.token');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: UID,
      email: 'p@example.com',
      displayName: 'Pat',
      uiLanguage: 'en',
    });
  });

  it('returns 503 when Supabase auth is unavailable', async () => {
    const sb = fakeSupabase();
    sb.auth.getUser = async () => ({ data: { user: null }, error: { status: 500 } });
    const res = await request(appWith(sb))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer good.token');
    expect(res.status).toBe(503);
  });

  it('returns 503 when Supabase is not configured', async () => {
    const res = await request(createApp(config, pino({ level: 'silent' })))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer good.token');
    expect(res.status).toBe(503);
  });

  it('returns a generic 500 if the profile row is missing', async () => {
    const res = await request(appWith(fakeSupabase({ profile: null })))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer good.token');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
