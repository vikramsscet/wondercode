import request from 'supertest';
import pino from 'pino';
import { createApp, createLogger } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

const config = loadConfig({ CORS_ORIGINS: 'http://localhost:5173' });
const app = createApp(config, pino({ level: 'silent' }));

describe('GET /api/v1/health', () => {
  it('returns the success envelope with a request id', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.meta.requestId).toBe(res.headers['x-request-id']);
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('reuses a valid incoming request id and replaces an invalid one', async () => {
    const ok = await request(app).get('/api/v1/health').set('X-Request-Id', 'abc-12345678');
    expect(ok.headers['x-request-id']).toBe('abc-12345678');
    const bad = await request(app).get('/api/v1/health').set('X-Request-Id', 'x y');
    expect(bad.headers['x-request-id']).not.toBe('x y');
  });
});

describe('CORS', () => {
  it('allows the configured origin', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('rejects other origins with the error envelope', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CORS_FORBIDDEN');
  });
});

describe('error handling', () => {
  it('returns 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: 'NOT_FOUND' } });
  });

  it('returns 400 for malformed JSON without leaking internals', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/stack|SyntaxError/);
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .send({ data: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe('config', () => {
  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid PORT/);
  });
  it('parses multiple CORS origins', () => {
    expect(loadConfig({ CORS_ORIGINS: 'http://a.com, http://b.com' }).corsOrigins).toEqual([
      'http://a.com',
      'http://b.com',
    ]);
  });
});

describe('logging', () => {
  it('redacts the authorization header', async () => {
    const lines = [];
    const logger = createLogger(config, { write: (l) => lines.push(l) });
    await request(createApp(config, logger))
      .get('/api/v1/health')
      .set('Authorization', 'Bearer SECRET');
    expect(lines.join('')).not.toContain('SECRET');
  });
});
