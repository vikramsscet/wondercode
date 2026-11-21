import { loadConfig } from '../src/config/env.js';
import { createSupabaseAdmin, isSupabaseConfigured } from '../src/config/supabase.js';
import { checkSupabaseConnection } from '../src/services/supabaseHealth.js';

const withKeys = loadConfig({
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
});

describe('supabase config', () => {
  it('is optional so the API can start without it', () => {
    expect(isSupabaseConfigured(loadConfig({}))).toBe(false);
    expect(isSupabaseConfigured(withKeys)).toBe(true);
  });

  it('refuses to create a client without credentials', () => {
    expect(() => createSupabaseAdmin(loadConfig({}))).toThrow(/not configured/);
  });

  it('rejects an invalid URL', () => {
    const bad = loadConfig({ SUPABASE_URL: 'nope', SUPABASE_SERVICE_ROLE_KEY: 'k' });
    expect(() => createSupabaseAdmin(bad)).toThrow(/valid URL/);
  });

  it('creates a client when configured', () => {
    expect(createSupabaseAdmin(withKeys)).toBeDefined();
  });
});

describe('checkSupabaseConnection', () => {
  const fake = (impl) => ({ auth: { admin: { listUsers: impl } } });

  it('reports ok', async () => {
    expect(await checkSupabaseConnection(fake(async () => ({ error: null })))).toEqual({
      ok: true,
    });
  });

  it('reports an invalid key without leaking details', async () => {
    const r = await checkSupabaseConnection(
      fake(async () => ({ error: { status: 401, message: 'secret-key rejected' } })),
    );
    expect(r).toEqual({ ok: false, reason: 'invalid_key' });
  });

  it('reports unreachable on exceptions', async () => {
    const r = await checkSupabaseConnection(
      fake(async () => {
        throw new Error('ENOTFOUND');
      }),
    );
    expect(r).toEqual({ ok: false, reason: 'unreachable' });
  });
});
