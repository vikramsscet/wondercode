import { createHash } from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { visualExplanation } from '../src/modules/ai/ai.schemas.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { VISUALS } from '../src/providers/ai/mock/templates.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';
const silent = { warn() {}, info() {}, error() {} };
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const l = (t) => ({ en: t, hi: t, hinglish: t });

class SpyProvider extends MockAIProvider {
  explainOverride = null;
  teacherOverride = null;
  async explainCode(input) {
    const r = await super.explainCode(input);
    return this.explainOverride ? { ...r, data: this.explainOverride(r.data) } : r;
  }
  async answerTeacherQuestion(input) {
    const r = await super.answerTeacherQuestion(input);
    return this.teacherOverride ? { ...r, data: this.teacherOverride(r.data) } : r;
  }
}

async function setup() {
  const provider = new SpyProvider();
  const supabase = createFakeSupabase({
    users: { a: PARENT },
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
  const config = loadConfig({ AI_RETRY_BASE_MS: '0', AI_MAX_RETRIES: '0' });
  const ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), { supabase, ai });
  const as = (req) => req.set('Authorization', 'Bearer a').set('X-Child-Id', CHILD);
  const plan = (
    await provider.generateProjectPlan({ prompt: 'a quiz about space', language: 'en' })
  ).data;
  const made = (await as(request(app).post('/api/v1/projects/generate')).send({ plan })).body.data;
  const key = [...supabase.objects.keys()].find((k) => k.endsWith('/script.js'));
  const lines = supabase.objects.get(key).split('\n');
  const explain = () =>
    as(request(app).post(`/api/v1/projects/${made.project.id}/explanations`)).send({
      versionId: made.version.id,
      filePath: 'script.js',
      lineStart: 1,
      lineEnd: 1,
      codeHash: sha(lines[0]),
      explanationLanguage: 'en',
    });
  const ask = () =>
    as(request(app).post('/api/v1/teacher/ask')).send({
      projectId: made.project.id,
      question: 'What does this do?',
      explanationLanguage: 'en',
    });
  return { app, as, provider, supabase, made, explain, ask };
}

describe('visual explanation schema', () => {
  it('accepts every mock visual', () => {
    for (const [name, v] of Object.entries(VISUALS)) {
      const r = visualExplanation.safeParse(v);
      expect(r.success, `${name}: ${r.error?.message}`).toBe(true);
    }
  });

  const flow = (nodes) => ({ title: l('t'), flow: { nodes } });
  const a = { id: 'a', kind: 'start', text: l('A'), next: 'b' };
  const b = { id: 'b', kind: 'end', text: l('B') };

  it.each([
    ['nothing to show', { title: l('t') }],
    ['one step only', { title: l('t'), steps: [l('x')] }],
    ['unknown field', { title: l('t'), steps: [l('x'), l('y')], html: '<b>x</b>' }],
    ['too many steps', { title: l('t'), steps: Array.from({ length: 9 }, () => l('x')) }],
    ['missing language', { title: { en: 'x' }, steps: [l('x'), l('y')] }],
    ['too long text', { title: l('t'), steps: [l('x'.repeat(121)), l('y')] }],
    ['duplicate node ids', flow([a, { ...b, id: 'a' }])],
    ['dangling pointer', flow([{ ...a, next: 'zzz' }, b])],
    ['question without no', flow([{ id: 'a', kind: 'decision', text: l('?'), yes: 'b' }, b])],
    ['step with yes/no', flow([{ ...a, yes: 'b', no: 'b' }, b])],
    [
      'question with next',
      flow([{ id: 'a', kind: 'decision', text: l('?'), yes: 'b', no: 'b', next: 'b' }, b]),
    ],
    ['end with a next', flow([a, { ...b, next: 'a' }])],
    ['bad node id', flow([{ ...a, id: 'A B' }, b])],
    [
      'too many nodes',
      flow(Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, kind: 'step', text: l('x') }))),
    ],
    ['empty example', { title: l('t'), examples: [{ input: '', output: 'x' }] }],
  ])('rejects %s', (_name, v) => {
    expect(visualExplanation.safeParse(v).success).toBe(false);
  });

  it('allows loops back to an earlier box', () => {
    expect(
      visualExplanation.safeParse(
        flow([
          { id: 'a', kind: 'start', text: l('A'), next: 'b' },
          { id: 'b', kind: 'decision', text: l('?'), yes: 'a', no: 'c' },
          { id: 'c', kind: 'end', text: l('C') },
        ]),
      ).success,
    ).toBe(true);
  });
});

describe('visuals in code explanations', () => {
  it('returns the visual, stores it, and serves it from the cache', async () => {
    const { explain, supabase } = await setup();
    const first = await explain();
    expect(first.status).toBe(200);
    expect(visualExplanation.safeParse(first.body.data.visual).success).toBe(true);
    expect(supabase.db.code_explanations[0].explanation_payload.visual).toEqual(
      first.body.data.visual,
    );
    const second = await explain();
    expect(second.body.data.cached).toBe(true);
    expect(second.body.data.visual).toEqual(first.body.data.visual);
  });

  it('still works when the provider sends no visual', async () => {
    const { explain, provider } = await setup();
    provider.explainOverride = ({ visual: _v, ...rest }) => rest;
    const res = await explain();
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('visual');
  });

  it.each(['See https://evil.example', 'Use <b>bold</b>', 'how to make a bomb'])(
    'rejects a visual containing "%s" and stores nothing',
    async (bad) => {
      const { explain, provider, supabase } = await setup();
      provider.explainOverride = (d) => ({
        ...d,
        visual: { title: l('ok'), steps: [l('fine'), l(bad)] },
      });
      const res = await explain();
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
      expect(JSON.stringify(res.body)).not.toContain('evil');
      expect(supabase.db.code_explanations).toHaveLength(0);
    },
  );

  it('rejects a malformed visual from the provider', async () => {
    const { explain, provider } = await setup();
    provider.explainOverride = (d) => ({ ...d, visual: { title: l('t'), html: '<svg onload=x>' } });
    expect((await explain()).status).toBe(502);
  });
});

describe('visuals in teacher answers', () => {
  it('returns, stores and restores the visual', async () => {
    const { ask, as, app, made, supabase } = await setup();
    const res = await ask();
    expect(res.status).toBe(200);
    expect(visualExplanation.safeParse(res.body.data.visual).success).toBe(true);
    const rows = supabase.db.teacher_messages;
    expect(rows[0].visual).toBeNull(); // the child's own message has none
    expect(rows[1].visual).toEqual(res.body.data.visual);
    const got = await as(
      request(app).get(`/api/v1/teacher/conversations?projectId=${made.project.id}`),
    );
    expect(got.body.data.messages[0]).not.toHaveProperty('visual');
    expect(got.body.data.messages[1].visual).toEqual(res.body.data.visual);
  });

  it('works without a visual', async () => {
    const { ask, provider, supabase } = await setup();
    provider.teacherOverride = ({ visual: _v, ...rest }) => rest;
    const res = await ask();
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('visual');
    expect(supabase.db.teacher_messages[1].visual).toBeNull();
  });

  it('rejects an unsafe visual and stores no chat', async () => {
    const { ask, provider, supabase } = await setup();
    provider.teacherOverride = (d) => ({
      ...d,
      visual: { title: l('ok'), examples: [{ input: 'x', output: 'visit www.evil.example' }] },
    });
    const res = await ask();
    expect(res.status).toBe(502);
    expect(supabase.db.teacher_messages).toHaveLength(0);
    expect(supabase.db.teacher_conversations).toHaveLength(0);
  });
});
