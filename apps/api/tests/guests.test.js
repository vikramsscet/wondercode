import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import {
  assertGuestProjectQuota,
  createGuestSession,
  hashToken,
  purgeExpiredGuests,
} from '../src/modules/guests/guests.service.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001', email: 'a@example.com' };

function setup(env = {}) {
  const config = loadConfig(env);
  const supabase = createFakeSupabase({ users: { 'parent-token': PARENT } });
  const app = createApp(config, pino({ level: 'silent' }), { supabase });
  return { config, supabase, app };
}
const start = (app) => request(app).post('/api/v1/auth/guest-session');

describe('guest sessions', () => {
  it('creates a session, returns the token once and stores only its hash', async () => {
    const { app, supabase } = setup();
    const res = await start(app);
    expect(res.status).toBe(201);
    const { token, expiresAt, limits } = res.body.data;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(limits).toEqual({ maxProjects: 2, usageLimit: 10 });
    expect(new Date(expiresAt) > new Date()).toBe(true);

    const [row] = supabase.db.guest_sessions;
    expect(row.session_token_hash).toBe(hashToken(token));
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it('gives each session a different token', async () => {
    const { app } = setup();
    const a = (await start(app)).body.data.token;
    const b = (await start(app)).body.data.token;
    expect(a).not.toBe(b);
  });

  it('returns status for a valid token and ends the session on delete', async () => {
    const { app } = setup();
    const { token } = (await start(app)).body.data;
    const me = await request(app).get('/api/v1/auth/guest-session').set('X-Guest-Token', token);
    expect(me.status).toBe(200);
    expect(me.body.data).not.toHaveProperty('token');

    const del = await request(app).delete('/api/v1/auth/guest-session').set('X-Guest-Token', token);
    expect(del.body.data).toEqual({ ended: true });
    const after = await request(app).get('/api/v1/auth/guest-session').set('X-Guest-Token', token);
    expect(after.status).toBe(401);
  });

  it('rejects missing, malformed, unknown and parent tokens', async () => {
    const { app } = setup();
    const get = (t) => {
      const r = request(app).get('/api/v1/auth/guest-session');
      return t ? r.set('X-Guest-Token', t) : r;
    };
    expect((await get()).status).toBe(401);
    expect((await get('short')).status).toBe(401);
    expect((await get('A'.repeat(43))).status).toBe(401);
    expect((await get('parent-token')).status).toBe(401);
  });

  it('returns GUEST_SESSION_EXPIRED for an expired session', async () => {
    const { app, supabase } = setup();
    const { token } = (await start(app)).body.data;
    supabase.db.guest_sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();
    const res = await request(app).get('/api/v1/auth/guest-session').set('X-Guest-Token', token);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GUEST_SESSION_EXPIRED');
  });

  it('respects configured lifetime and limits', async () => {
    const { config, supabase } = setup({
      GUEST_TTL_MINUTES: '30',
      GUEST_MAX_PROJECTS: '1',
      GUEST_USAGE_LIMIT: '3',
    });
    const now = new Date('2026-01-01T00:00:00Z');
    const g = await createGuestSession(supabase, config, now);
    expect(g.expiresAt).toBe('2026-01-01T00:30:00.000Z');
    expect(g.limits).toEqual({ maxProjects: 1, usageLimit: 3 });
  });

  it('rate limits session creation per IP', async () => {
    const { app } = setup({ GUEST_SESSIONS_PER_IP_PER_HOUR: '2' });
    expect((await start(app)).status).toBe(201);
    expect((await start(app)).status).toBe(201);
    const third = await start(app);
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('RATE_LIMITED');
  });

  it('returns 503 when Supabase is not configured', async () => {
    const app = createApp(loadConfig({}), pino({ level: 'silent' }));
    expect((await start(app)).status).toBe(503);
  });
});

describe('guest isolation from parent data', () => {
  it('a guest token cannot reach parent or child endpoints', async () => {
    const { app } = setup();
    const { token } = (await start(app)).body.data;
    for (const header of [
      ['X-Guest-Token', token],
      ['Authorization', `Bearer ${token}`],
    ]) {
      expect(
        (
          await request(app)
            .get('/api/v1/auth/me')
            .set(...header)
        ).status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .get('/api/v1/children')
            .set(...header)
        ).status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .post('/api/v1/children')
            .set(...header)
            .send({})
        ).status,
      ).toBe(401);
    }
  });
});

describe('guest quota and cleanup', () => {
  it('blocks creating more projects than the quota', async () => {
    const { config, supabase } = setup();
    const g = await createGuestSession(supabase, config);
    await assertGuestProjectQuota(supabase, config, g.id);
    supabase.db.projects.push(
      { id: 'p1', guest_session_id: g.id },
      { id: 'p2', guest_session_id: g.id },
    );
    await expect(assertGuestProjectQuota(supabase, config, g.id)).rejects.toMatchObject({
      status: 409,
      code: 'GUEST_LIMIT_REACHED',
    });
    // Another guest is unaffected.
    const other = await createGuestSession(supabase, config);
    await assertGuestProjectQuota(supabase, config, other.id);
  });

  it('purges only expired sessions', async () => {
    const { config, supabase } = setup();
    const old = await createGuestSession(supabase, config, new Date(Date.now() - 24 * 3600_000));
    const fresh = await createGuestSession(supabase, config);
    expect(await purgeExpiredGuests(supabase)).toBe(1);
    const ids = supabase.db.guest_sessions.map((r) => r.id);
    expect(ids).toContain(fresh.id);
    expect(ids).not.toContain(old.id);
  });
});

describe('guest config validation', () => {
  it('rejects non-positive values', () => {
    expect(() => loadConfig({ GUEST_TTL_MINUTES: '0' })).toThrow(/GUEST_TTL_MINUTES/);
    expect(() => loadConfig({ GUEST_MAX_PROJECTS: 'abc' })).toThrow(/GUEST_MAX_PROJECTS/);
  });
});
