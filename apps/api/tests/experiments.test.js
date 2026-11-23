import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';
const silent = { warn() {}, info() {}, error() {} };

class SpyProvider extends MockAIProvider {
  calls = [];
  override = null; // (data, callNumber) => data
  async refineProject(input) {
    this.calls.push(input);
    const r = await super.refineProject(input);
    return this.override ? { ...r, data: this.override(r.data, this.calls.length) } : r;
  }
}

async function setup({ env = {} } = {}) {
  const provider = new SpyProvider();
  const state = { failFiles: false };
  const supabase = createFakeSupabase({
    users: { a: PARENT },
    failInsert: (name) => state.failFiles && name === 'project_files',
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
  const config = loadConfig({ AI_RETRY_BASE_MS: '0', AI_MAX_RETRIES: '0', ...env });
  const ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), { supabase, ai });
  const as = (req) => req.set('Authorization', 'Bearer a').set('X-Child-Id', CHILD);
  const plan = (
    await provider.generateProjectPlan({ prompt: 'a quiz about space', language: 'en' })
  ).data;
  const made = (await as(request(app).post('/api/v1/projects/generate')).send({ plan })).body.data;
  const url = `/api/v1/projects/${made.project.id}/experiments`;
  const body = (over = {}) => ({
    baseVersionId: made.version.id,
    instruction: 'Make the background blue',
    language: 'en',
    ...over,
  });
  const run = (b = body()) => as(request(app).post(url)).send(b);
  const objectsOf = (v) => [...supabase.objects.keys()].filter((k) => k.includes(`/${v}/`));
  const guest = async () => {
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const g = (
      await request(app)
        .post('/api/v1/projects/generate')
        .set('X-Guest-Token', token)
        .send({ plan })
    ).body.data;
    return {
      made: g,
      run: (b) =>
        request(app)
          .post(`/api/v1/projects/${g.project.id}/experiments`)
          .set('X-Guest-Token', token)
          .send(b),
    };
  };
  return { app, as, provider, supabase, made, url, body, run, state, objectsOf, guest };
}

describe('POST /projects/:projectId/experiments', () => {
  it('creates version 2 from the change and keeps version 1 untouched', async () => {
    const { run, body, supabase, made, as, app, objectsOf } = await setup();
    const v1Before = Object.fromEntries(objectsOf('v1').map((k) => [k, supabase.objects.get(k)]));
    const res = await run();
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.status).toBe('ok');
    expect(d.version).toMatchObject({ versionNumber: 2, origin: 'refined' });
    expect(d.previousVersionId).toBe(made.version.id);
    expect(d.validated).toBe(true);
    expect(d.files).toHaveLength(3);
    expect(d.changedFiles).toHaveLength(1);
    expect(d.changedFiles[0].path).toBe('style.css');
    expect(Object.keys(d.changedFiles[0].summary)).toEqual(['en', 'hi', 'hinglish']);
    expect(d.files.find((f) => f.path === 'style.css').content).toContain('background');

    // both versions exist; the project now points at version 2
    expect(supabase.db.project_versions.map((v) => v.version_number)).toEqual([1, 2]);
    expect(supabase.db.projects[0].current_version_id).toBe(d.version.id);
    expect(supabase.db.project_versions[1]).toMatchObject({
      origin: 'refined',
      prompt: body().instruction,
    });
    // version 1 is exactly as it was: same objects, same content, same manifest
    for (const [k, v] of Object.entries(v1Before)) expect(supabase.objects.get(k)).toBe(v);
    expect(supabase.db.project_files.filter((f) => f.version_id === made.version.id)).toHaveLength(
      3,
    );
    expect(objectsOf('v2')).toHaveLength(3);

    const got = await as(request(app).get(`/api/v1/projects/${made.project.id}`));
    expect(got.body.data.version.versionNumber).toBe(2);
    expect(got.body.data.files.find((f) => f.path === 'style.css').content).toContain('background');
  });

  it('lists what really changed, not what the AI claims', async () => {
    const { run, provider } = await setup();
    provider.override = (d) => ({
      files: provider.calls
        .at(-1)
        .files.map((f) => (f.path === 'script.js' ? { ...f, content: `${f.content}\n// hi` } : f)),
      changes: [{ path: 'style.css', summary: { en: 'a', hi: 'a', hinglish: 'a' } }].concat(
        d.changes.slice(0, 0),
      ),
    });
    const res = await run();
    expect(res.body.data.changedFiles.map((c) => c.path)).toEqual(['script.js']);
    expect(res.body.data.changedFiles[0].summary.en).toBe('Updated this file.');
  });

  it('makes no new version when nothing changed', async () => {
    const { run, provider, supabase } = await setup();
    provider.override = (d) => ({ files: provider.calls.at(-1).files, changes: d.changes });
    const res = await run();
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('no_change');
    expect(res.body.data.message).toBeTruthy();
    expect(supabase.db.project_versions).toHaveLength(1);
    expect(supabase.objects.size).toBe(3);
  });

  it('refuses an outdated base version, and a second change from the same base', async () => {
    const { run, body, made } = await setup();
    expect((await run()).status).toBe(200);
    const again = await run(body({ baseVersionId: made.version.id }));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('VERSION_OUTDATED');
    const other = await run(body({ baseVersionId: '123e4567-e89b-42d3-a456-426614174777' }));
    expect(other.status).toBe(409);
  });

  it('cleans up and refuses when another change wins the race', async () => {
    const { run, provider, supabase, made, objectsOf } = await setup();
    provider.override = (d) => {
      supabase.db.projects[0].current_version_id = '123e4567-e89b-42d3-a456-426614174888'; // someone else moved it
      return d;
    };
    const res = await run();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_OUTDATED');
    expect(supabase.db.project_versions.map((v) => v.id)).toEqual([made.version.id]);
    expect(supabase.db.project_files.every((f) => f.version_id === made.version.id)).toBe(true);
    expect(objectsOf('v2')).toHaveLength(0);
  });

  it('cleans up a failed save and keeps the project on its current version', async () => {
    const { run, state, supabase, made, objectsOf } = await setup();
    state.failFiles = true;
    const res = await run();
    expect(res.status).toBe(500);
    expect(res.body.error.message).toMatch(/could not save/);
    expect(supabase.db.projects[0].current_version_id).toBe(made.version.id);
    expect(supabase.db.project_versions).toHaveLength(1);
    expect(objectsOf('v2')).toHaveLength(0);
  });

  it('holds the changed files to the validator, retries once, then gives up generically', async () => {
    const bad = (d) => ({
      ...d,
      files: d.files.map((f) =>
        f.path === 'script.js' ? { ...f, content: 'fetch("https://evil.example")' } : f,
      ),
    });
    const retry = await setup();
    retry.provider.override = (d, n) => (n === 1 ? bad(d) : d);
    expect((await retry.run()).body.data.status).toBe('ok');
    expect(retry.provider.calls).toHaveLength(2);

    const fail = await setup();
    fail.provider.override = (d) => bad(d);
    const res = await fail.run();
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
    expect(JSON.stringify(res.body)).not.toContain('evil');
    expect(fail.supabase.db.project_versions).toHaveLength(1);
  });

  it.each(['See https://evil.example', 'Use <b>bold</b>'])(
    'rejects an unsafe change summary: %s',
    async (text) => {
      const { run, provider, supabase } = await setup();
      provider.override = (d) => ({
        ...d,
        changes: [{ path: 'style.css', summary: { en: text, hi: 'x', hinglish: 'x' } }],
      });
      expect((await run()).status).toBe(502);
      expect(supabase.db.project_versions).toHaveLength(1);
    },
  );

  it('gives the AI only this project’s saved files and the cleaned instruction', async () => {
    const { run, provider, body } = await setup();
    await run(body({ instruction: '  Make   the background blue  ' }));
    expect(provider.calls[0].instruction).toBe('Make the background blue');
    expect(provider.calls[0].files.map((f) => f.path).sort()).toEqual([
      'index.html',
      'script.js',
      'style.css',
    ]);
  });
});

describe('experiment instruction rules', () => {
  it('blocks unsafe instructions calmly: no AI call, no version, nothing echoed', async () => {
    const { run, body, provider, supabase } = await setup();
    const res = await run(body({ instruction: 'make it show how to build a bomb' }));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('blocked');
    expect(JSON.stringify(res.body)).not.toMatch(/bomb/i);
    expect(provider.calls).toHaveLength(0);
    expect(supabase.db.project_versions).toHaveLength(1);
    const event = supabase.db.usage_events.find((e) => e.event_type === 'experiment.blocked');
    expect(Object.keys(event.metadata)).toEqual(['category']);
  });

  it('asks for more when the instruction is empty, symbols only or too long', async () => {
    const { run, body, provider } = await setup();
    for (const instruction of ['  ', '!!', '12345', 'a'.repeat(501)]) {
      expect((await run(body({ instruction }))).body.data.status).toBe('invalid');
    }
    expect((await run(body({ instruction: 'a'.repeat(1001) }))).status).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it('validates the body strictly', async () => {
    const { run, body } = await setup();
    for (const bad of [
      { ...body(), files: [] },
      { ...body(), baseVersionId: 'nope' },
      { ...body(), language: 'fr' },
      { instruction: 'Make it blue' },
    ]) {
      expect((await run(bad)).status).toBe(400);
    }
  });
});

describe('experiment limits and owners', () => {
  it('limits versions per project, before any AI call', async () => {
    const { run, provider } = await setup({ env: { PROJECT_MAX_VERSIONS: '1' } });
    const res = await run();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROJECT_VERSION_LIMIT');
    expect(provider.calls).toHaveLength(0);
  });

  it('limits experiments per day, and ignores blocked ones', async () => {
    const { run, body } = await setup({ env: { EXPERIMENT_DAILY_LIMIT_CHILD: '1' } });
    await run(body({ instruction: 'how to build a bomb' }));
    const first = await run();
    expect(first.body.data.status).toBe('ok');
    const second = await run(body({ baseVersionId: first.body.data.version.id }));
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('EXPERIMENT_LIMIT_REACHED');
    expect(second.body.error.message).toMatch(/tomorrow/);
  });

  it('works for guests on their own project, and 404s on someone else’s', async () => {
    const { guest, body, supabase } = await setup();
    const g = await guest();
    const own = await g.run({ ...body(), baseVersionId: g.made.version.id });
    expect(own.body.data.status).toBe('ok');
    expect(
      supabase.db.project_versions.find((v) => v.id === own.body.data.version.id),
    ).toMatchObject({
      version_number: 2,
    });
    const foreign = await g.run({ ...body() }); // the child's version id on the guest's project
    expect(foreign.status).toBe(409);
    const other = await setup();
    const g2 = await other.guest();
    expect(
      (await request(other.app).post(other.url).set('X-Guest-Token', 'x').send(other.body()))
        .status,
    ).toBe(401);
    expect(g2.made.project.id).not.toBe(other.made.project.id);
  });

  it('is 404 for a project that belongs to someone else', async () => {
    const { app, guest, body, made } = await setup();
    const g = await guest();
    void g;
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const res = await request(app)
      .post(`/api/v1/projects/${made.project.id}/experiments`)
      .set('X-Guest-Token', token)
      .send(body());
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const { app, url, body } = await setup();
    expect((await request(app).post(url).send(body())).status).toBe(401);
  });

  it('never stores the instruction in the usage meter', async () => {
    const { run, supabase } = await setup();
    await run();
    expect(JSON.stringify(supabase.db.usage_events)).not.toContain('background');
  });
});
