import { createHash } from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { enforceExplanationPolicy } from '../src/modules/explanations/explanations.policy.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
const OTHER = { id: '123e4567-e89b-42d3-a456-426614174002' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';
const silent = { warn() {}, info() {}, error() {} };
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');

class SpyProvider extends MockAIProvider {
  calls = [];
  override = null;
  async explainCode(input) {
    this.calls.push(input);
    const result = await super.explainCode(input);
    return this.override ? { ...result, data: this.override(result.data) } : result;
  }
}

async function setup() {
  const provider = new SpyProvider();
  const supabase = createFakeSupabase({
    users: { a: PARENT, b: OTHER },
    tables: {
      child_profiles: [
        {
          id: CHILD,
          parent_id: PARENT.id,
          display_name: 'Mia',
          age: 9,
          avatar_key: 'fox',
          explanation_language: 'en',
          interests: [],
          deleted_at: null,
        },
      ],
    },
  });
  const config = loadConfig({ AI_RETRY_BASE_MS: '0' });
  const ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), { supabase, ai });
  const as = (req) => req.set('Authorization', 'Bearer a').set('X-Child-Id', CHILD);
  const plan = (
    await provider.generateProjectPlan({ prompt: 'a quiz about space', language: 'en' })
  ).data;
  const made = (await as(request(app).post('/api/v1/projects/generate')).send({ plan })).body.data;
  const content = supabase.db.project_files.length
    ? [...supabase.objects.entries()].find(([k]) => k.endsWith('/script.js'))[1]
    : '';
  const lines = content.split('\n');
  const body = (over = {}) => {
    const lineStart = over.lineStart ?? 1;
    const lineEnd = over.lineEnd ?? 1;
    return {
      versionId: made.version.id,
      filePath: 'script.js',
      lineStart,
      lineEnd,
      codeHash: sha(lines.slice(lineStart - 1, lineEnd).join('\n')),
      explanationLanguage: 'en',
      ...over,
    };
  };
  const url = `/api/v1/projects/${made.project.id}/explanations`;
  const explain = (b = body()) => as(request(app).post(url)).send(b);
  return { app, as, provider, supabase, made, content, lines, body, url, explain };
}

describe('POST /projects/:projectId/explanations', () => {
  it('explains saved lines, bound to version, file, lines and hash, without echoing code', async () => {
    const { explain, made, body, lines, provider } = await setup();
    const res = await explain();
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toMatchObject({
      versionId: made.version.id,
      filePath: 'script.js',
      lineStart: 1,
      lineEnd: 1,
      codeHash: body().codeHash,
      explanationLanguage: 'en',
      stale: false,
      cached: false,
      isMock: true,
    });
    expect(Object.keys(d.explanation)).toEqual(['en', 'hi', 'hinglish']);
    expect(d.concept).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain(lines[0]); // the code itself is not echoed
    expect(provider.calls).toHaveLength(1);
  });

  it('stores one immutable row owned by the child and serves repeats from the cache', async () => {
    const { explain, supabase, provider } = await setup();
    await explain();
    const again = await explain();
    expect(again.body.data.cached).toBe(true);
    expect(provider.calls).toHaveLength(1);
    expect(supabase.db.code_explanations).toHaveLength(1);
    expect(supabase.db.code_explanations[0]).toMatchObject({
      child_profile_id: CHILD,
      guest_session_id: null,
      file_path: 'script.js',
      explanation_language: 'en',
    });
  });

  it('caches each language separately', async () => {
    const { explain, body, provider, supabase } = await setup();
    await explain();
    const hi = await explain(body({ explanationLanguage: 'hi' }));
    expect(hi.body.data).toMatchObject({ explanationLanguage: 'hi', cached: false });
    expect(provider.calls).toHaveLength(2);
    expect(supabase.db.code_explanations).toHaveLength(2);
  });

  it('refuses a stale hash with 409 and never calls the AI', async () => {
    const { explain, body, provider } = await setup();
    const res = await explain(body({ codeHash: sha('something the child edited') }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EXPLANATION_STALE');
    expect(provider.calls).toHaveLength(0);
  });

  it('uses the server hash, not the provider hash, for the stored binding', async () => {
    const { explain, body, provider, supabase } = await setup();
    provider.override = (d) => ({
      ...d,
      codeHash: 'f'.repeat(64),
      lineStart: 99,
      filePath: 'x.js',
    });
    const res = await explain();
    expect(res.status).toBe(200);
    expect(supabase.db.code_explanations[0]).toMatchObject({
      code_hash: body().codeHash,
      line_start: 1,
      file_path: 'script.js',
    });
  });

  it('rejects ranges outside the file, too long, or blank', async () => {
    const { explain, body, lines, supabase, made } = await setup();
    const past = await explain(
      body({ lineStart: lines.length + 5, lineEnd: lines.length + 6, codeHash: sha('') }),
    );
    expect(past.status).toBe(422);
    expect(past.body.error.code).toBe('EXPLANATION_RANGE_INVALID');

    // a saved file with 60 lines and a blank line
    const key = [...supabase.objects.keys()].find((k) => k.endsWith('/script.js'));
    const long = Array.from({ length: 60 }, (_, i) => `let a${i} = ${i};`).join('\n') + '\n\n';
    supabase.objects.set(key, long);
    supabase.db.project_files.find((f) => f.storage_key === key).content_hash = sha(long);
    const l = long.split('\n');
    const tooMany = await explain({
      ...body(),
      lineStart: 1,
      lineEnd: 41,
      codeHash: sha(l.slice(0, 41).join('\n')),
    });
    expect(tooMany.status).toBe(422);
    const blank = await explain({ ...body(), lineStart: 61, lineEnd: 61, codeHash: sha('') });
    expect(blank.status).toBe(422);
    const ok = await explain({
      ...body(),
      lineStart: 1,
      lineEnd: 40,
      codeHash: sha(l.slice(0, 40).join('\n')),
    });
    expect(ok.status).toBe(200);
    expect(made.version.id).toBeTruthy();
  });

  it('validates the request body', async () => {
    const { explain, body } = await setup();
    for (const bad of [
      { ...body(), lineEnd: 0 },
      { ...body(), lineStart: 5, lineEnd: 2 },
      { ...body(), codeHash: 'nothex' },
      { ...body(), filePath: '../secret' },
      { ...body(), explanationLanguage: 'fr' },
      { ...body(), versionId: 'nope' },
      { ...body(), extra: 1 },
    ]) {
      expect((await explain(bad)).status).toBe(400);
    }
  });

  it('is 404 for unknown files, versions and other people’s projects', async () => {
    const { explain, body, app, url } = await setup();
    expect((await explain(body({ filePath: 'nope.js' }))).status).toBe(404);
    expect(
      (await explain(body({ versionId: '123e4567-e89b-42d3-a456-426614174777' }))).status,
    ).toBe(404);
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const guest = await request(app).post(url).set('X-Guest-Token', token).send(body());
    expect(guest.status).toBe(404);
  });

  it('rejects a version that belongs to a different project', async () => {
    const { explain, body, supabase } = await setup();
    supabase.db.project_versions.push({
      id: '123e4567-e89b-42d3-a456-426614174888',
      project_id: '123e4567-e89b-42d3-a456-426614174889',
    });
    const res = await explain(body({ versionId: '123e4567-e89b-42d3-a456-426614174888' }));
    expect(res.status).toBe(404);
  });

  it('refuses to explain tampered storage', async () => {
    const { explain, supabase } = await setup();
    const key = [...supabase.objects.keys()].find((k) => k.endsWith('/script.js'));
    supabase.objects.set(key, 'tampered');
    expect((await explain()).status).toBe(500);
  });

  it('works for guests and keeps their rows separate', async () => {
    const { app, supabase, provider } = await setup();
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const plan = (await provider.generateProjectPlan({ prompt: 'a quiz', language: 'en' })).data;
    const made = (
      await request(app)
        .post('/api/v1/projects/generate')
        .set('X-Guest-Token', token)
        .send({ plan })
    ).body.data;
    const key = [...supabase.objects.keys()].filter((k) => k.endsWith('/script.js')).pop();
    const first = supabase.objects.get(key).split('\n')[0];
    const res = await request(app)
      .post(`/api/v1/projects/${made.project.id}/explanations`)
      .set('X-Guest-Token', token)
      .send({
        versionId: made.version.id,
        filePath: 'script.js',
        lineStart: 1,
        lineEnd: 1,
        codeHash: sha(first),
        explanationLanguage: 'hinglish',
      });
    expect(res.status).toBe(200);
    expect(supabase.db.code_explanations[0]).toMatchObject({
      child_profile_id: null,
      guest_session_id: expect.any(String),
    });
  });

  it('requires authentication', async () => {
    const { app, url, body } = await setup();
    expect((await request(app).post(url).send(body())).status).toBe(401);
  });
});

describe('explanation policy', () => {
  const good = {
    concept: 'variable',
    explanation: { en: 'A box.', hi: 'डिब्बा।', hinglish: 'Ek dabba.' },
    realLifeExample: { en: 'A scoreboard.', hi: 'स्कोरबोर्ड।', hinglish: 'Scoreboard.' },
    tryThis: 'Change the number.',
  };
  const withText = (en) => ({ ...good, explanation: { ...good.explanation, en } });

  it('accepts clean text and drops extra fields', () => {
    expect(enforceExplanationPolicy({ ...good, codeHash: 'x', lineStart: 1 })).toEqual(good);
  });

  it.each([
    'Visit https://evil.example now',
    'see www.evil.example',
    'Use <b>bold</b> here',
    '<script>alert(1)</script>',
    'how to make a bomb',
  ])('rejects %s', (text) => {
    expect(() => enforceExplanationPolicy(withText(text))).toThrow(/unexpected answer/);
  });

  it('is applied to provider output end to end, and nothing is stored', async () => {
    const { explain, provider, supabase } = await setup();
    provider.override = (d) => ({
      ...d,
      explanation: { ...d.explanation, hinglish: 'Dekho https://evil.example' },
    });
    const res = await explain();
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
    expect(JSON.stringify(res.body)).not.toContain('evil');
    expect(supabase.db.code_explanations).toHaveLength(0);
  });
});

describe('GET /projects/:projectId/explanations', () => {
  it('lists the version’s explanations and marks older versions stale', async () => {
    const { explain, as, app, url, made, supabase } = await setup();
    await explain();
    const list = await as(request(app).get(url));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ versionId: made.version.id, stale: false });

    // the project moves on to a newer version
    supabase.db.project_versions.push({
      id: '123e4567-e89b-42d3-a456-426614174555',
      project_id: made.project.id,
    });
    supabase.db.projects[0].current_version_id = '123e4567-e89b-42d3-a456-426614174555';
    const old = await as(request(app).get(`${url}?versionId=${made.version.id}`));
    expect(old.body.data[0].stale).toBe(true);
    const current = await as(request(app).get(url));
    expect(current.body.data).toEqual([]);
  });

  it('is 404 for other owners and unknown versions', async () => {
    const { as, app, url, made } = await setup();
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    expect((await request(app).get(url).set('X-Guest-Token', token)).status).toBe(404);
    const res = await as(request(app).get(`${url}?versionId=123e4567-e89b-42d3-a456-426614174777`));
    expect(res.status).toBe(404);
    expect(made.project.id).toBeTruthy();
  });
});
