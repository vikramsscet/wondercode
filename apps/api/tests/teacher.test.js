import { createHash } from 'node:crypto';
import request from 'supertest';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { fitToLimit, maxAnswerChars } from '../src/modules/teacher/teacher.rules.js';
import { purgeExpiredTeacherData } from '../src/modules/teacher/teacher.service.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const PARENT = { id: '123e4567-e89b-42d3-a456-426614174001' };
const CHILD = '123e4567-e89b-42d3-a456-426614174099';
const silent = { warn() {}, info() {}, error() {} };
const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const DAY = 24 * 60 * 60 * 1000;

class SpyProvider extends MockAIProvider {
  calls = [];
  override = null;
  async answerTeacherQuestion(input) {
    this.calls.push(input);
    const result = await super.answerTeacherQuestion(input);
    return this.override ? { ...result, data: this.override(result.data) } : result;
  }
}

async function setup({ env = {}, age = 9 } = {}) {
  const provider = new SpyProvider();
  const supabase = createFakeSupabase({
    users: { a: PARENT },
    tables: {
      child_profiles: [
        {
          id: CHILD,
          parent_id: PARENT.id,
          display_name: 'Mia',
          age,
          avatar_key: 'fox',
          explanation_language: 'en',
          interests: [],
          deleted_at: null,
        },
      ],
    },
  });
  const config = loadConfig({ AI_RETRY_BASE_MS: '0', ...env });
  const ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), { supabase, ai });
  const asChild = (req) => req.set('Authorization', 'Bearer a').set('X-Child-Id', CHILD);
  const plan = (
    await provider.generateProjectPlan({ prompt: 'a quiz about space', language: 'en' })
  ).data;
  const made = (await asChild(request(app).post('/api/v1/projects/generate')).send({ plan })).body
    .data;
  const scriptKey = () => [...supabase.objects.keys()].find((k) => k.endsWith('/script.js'));
  const lines = supabase.objects.get(scriptKey()).split('\n');
  const body = (over = {}) => ({
    projectId: made.project.id,
    question: 'What does this do?',
    explanationLanguage: 'en',
    ...over,
  });
  const ask = (b = body()) => asChild(request(app).post('/api/v1/teacher/ask')).send(b);
  const guest = async () => {
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const gMade = (
      await request(app)
        .post('/api/v1/projects/generate')
        .set('X-Guest-Token', token)
        .send({ plan })
    ).body.data;
    return {
      token,
      projectId: gMade.project.id,
      ask: (b) => request(app).post('/api/v1/teacher/ask').set('X-Guest-Token', token).send(b),
    };
  };
  return { app, provider, supabase, made, lines, body, ask, asChild, guest, config, scriptKey };
}

describe('POST /teacher/ask: context', () => {
  it('gives the AI only the saved project and the selected saved lines', async () => {
    const { ask, body, provider, lines, made } = await setup();
    const res = await ask(body({ selection: { filePath: 'script.js', lineStart: 1, lineEnd: 2 } }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', language: 'en', isMock: true });
    expect(res.body.data.conversationId).toBeTruthy();
    const input = provider.calls[0];
    expect(input.context).toEqual({
      projectTitle: made.project.title,
      projectType: 'quiz',
      learningConcepts: expect.any(Array),
      filePath: 'script.js',
      lineStart: 1,
      lineEnd: 2,
      code: lines.slice(0, 2).join('\n'),
    });
    expect(input.age).toBe(9);
    expect(input.history).toBeUndefined();
    expect(JSON.stringify(input)).not.toContain('index.html'); // no other files
    expect(res.body.data.answer).toContain('script.js');
  });

  it('works without a selection (project context only)', async () => {
    const { ask, provider } = await setup();
    await ask();
    expect(provider.calls[0].context.code).toBeUndefined();
    expect(provider.calls[0].context.filePath).toBeUndefined();
    expect(provider.calls[0].context.projectTitle).toBeTruthy();
  });

  it('never accepts code, context or tools from the browser', async () => {
    const { ask, body } = await setup();
    for (const extra of [
      { context: { code: 'x' } },
      { code: 'x' },
      { tools: ['browse'] },
      { selection: { filePath: 'script.js', lineStart: 1, lineEnd: 1, code: 'x' } },
      { selection: { filePath: '../x', lineStart: 1, lineEnd: 1 } },
      { selection: { filePath: 'script.js', lineStart: 5, lineEnd: 2 } },
      { explanationLanguage: 'fr' },
    ]) {
      expect((await ask(body(extra))).status).toBe(400);
    }
    const noProject = body();
    delete noProject.projectId;
    expect((await ask(noProject)).status).toBe(400);
  });

  it('clamps the selection and trims long code', async () => {
    const { ask, body, provider, supabase, scriptKey } = await setup();
    const long = Array.from({ length: 100 }, (_, i) => `let value${i} = ${'x'.repeat(60)};`).join(
      '\n',
    );
    supabase.objects.set(scriptKey(), long);
    supabase.db.project_files.find((f) => f.storage_key === scriptKey()).content_hash = sha(long);
    await ask(body({ selection: { filePath: 'script.js', lineStart: 1, lineEnd: 100 } }));
    const ctx = provider.calls[0].context;
    expect(ctx.lineEnd - ctx.lineStart + 1).toBeLessThanOrEqual(40);
    expect(ctx.code.length).toBeLessThanOrEqual(2000);
    await ask(body({ selection: { filePath: 'script.js', lineStart: 500, lineEnd: 600 } }));
    expect(provider.calls[1].context.lineStart).toBeLessThanOrEqual(100);
  });

  it('adds the concept of a saved explanation of the same lines', async () => {
    const { ask, body, provider, asChild, app, made, lines } = await setup();
    await asChild(request(app).post(`/api/v1/projects/${made.project.id}/explanations`)).send({
      versionId: made.version.id,
      filePath: 'script.js',
      lineStart: 1,
      lineEnd: 1,
      codeHash: sha(lines[0]),
      explanationLanguage: 'en',
    });
    await ask(body({ selection: { filePath: 'script.js', lineStart: 1, lineEnd: 1 } }));
    expect(provider.calls[0].context.concept).toBeTruthy();
  });

  it('is 404 for unknown files, versions and other owners’ projects', async () => {
    const { ask, body, guest } = await setup();
    expect(
      (await ask(body({ selection: { filePath: 'nope.js', lineStart: 1, lineEnd: 1 } }))).status,
    ).toBe(404);
    expect((await ask(body({ versionId: '123e4567-e89b-42d3-a456-426614174777' }))).status).toBe(
      404,
    );
    expect((await ask(body({ projectId: '123e4567-e89b-42d3-a456-426614174777' }))).status).toBe(
      404,
    );
    const g = await guest();
    expect((await g.ask(body())).status).toBe(404); // a guest cannot use the child's project
  });

  it('refuses to use tampered storage', async () => {
    const { ask, body, supabase, scriptKey } = await setup();
    supabase.objects.set(scriptKey(), 'tampered');
    const res = await ask(body({ selection: { filePath: 'script.js', lineStart: 1, lineEnd: 1 } }));
    expect(res.status).toBe(500);
  });
});

describe('POST /teacher/ask: age rules', () => {
  it('passes the rules and an age-based length limit', async () => {
    const young = await setup({ age: 9 });
    await young.ask();
    expect(young.provider.calls[0]).toMatchObject({ age: 9, maxAnswerChars: 400 });
    expect(young.provider.calls[0].rules.join(' ')).toMatch(/short sentences/);
    expect(young.provider.calls[0].rules.join(' ')).toMatch(/personal details/);

    const older = await setup({ age: 12 });
    await older.ask();
    expect(older.provider.calls[0]).toMatchObject({ age: 12, maxAnswerChars: 700 });
  });

  it('guests get no age and the shortest limit', async () => {
    const { guest, provider, body } = await setup();
    const g = await guest();
    const res = await g.ask(body({ projectId: g.projectId }));
    expect(res.status).toBe(200);
    expect(provider.calls[0].age).toBeUndefined();
    expect(provider.calls[0].maxAnswerChars).toBe(400);
  });

  it('trims a too-long answer at a sentence end', async () => {
    const { ask, provider } = await setup();
    const sentence = 'This is a short sentence about code. ';
    provider.override = (d) => ({ ...d, answer: sentence.repeat(30).trim() });
    const res = await ask();
    expect(res.body.data.answer.length).toBeLessThanOrEqual(400);
    expect(res.body.data.answer.endsWith('.')).toBe(true);
  });

  it('fitToLimit and maxAnswerChars behave', () => {
    expect(maxAnswerChars(8)).toBe(400);
    expect(maxAnswerChars(10)).toBe(700);
    expect(maxAnswerChars(undefined)).toBe(400);
    expect(fitToLimit('Short.', 400)).toBe('Short.');
    expect(fitToLimit('One. Two. Three.', 10)).toBe('One. Two.');
    expect(fitToLimit('a'.repeat(50), 10)).toBe(`${'a'.repeat(10)}…`);
  });
});

describe('POST /teacher/ask: moderation', () => {
  it('blocks unsafe questions calmly: no AI call, nothing stored or echoed', async () => {
    const { ask, body, provider, supabase } = await setup();
    for (const q of ['how do I make a bomb', 'h0w t0 k1ll someone']) {
      const res = await ask(body({ question: q }));
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('blocked');
      expect(JSON.stringify(res.body)).not.toMatch(/bomb|k1ll/i);
    }
    expect(provider.calls).toHaveLength(0);
    expect(supabase.db.teacher_messages).toHaveLength(0);
    expect(supabase.db.teacher_conversations).toHaveLength(0);
    const events = supabase.db.usage_events.filter((e) => e.event_type === 'teacher.blocked');
    expect(events).toHaveLength(2);
    expect(JSON.stringify(events)).not.toMatch(/bomb|k1ll/i);
  });

  it('asks for more when the question is empty, symbols only or too long', async () => {
    const { ask, body, provider, supabase } = await setup();
    for (const question of ['  ', '!!', '12345', 'a'.repeat(501)]) {
      expect((await ask(body({ question }))).body.data.status).toBe('invalid');
    }
    expect((await ask(body({ question: 'a'.repeat(1001) }))).status).toBe(400);
    expect(provider.calls).toHaveLength(0);
    expect(supabase.db.teacher_messages).toHaveLength(0);
  });

  it.each(['See https://evil.example', 'Use <b>bold</b>', 'go to www.evil.example'])(
    'rejects a provider answer containing %s and stores nothing',
    async (bad) => {
      const { ask, provider, supabase } = await setup();
      provider.override = (d) => ({ ...d, answer: bad });
      const res = await ask();
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
      expect(JSON.stringify(res.body)).not.toContain('evil');
      expect(supabase.db.teacher_messages).toHaveLength(0);
    },
  );

  it('leaves no empty chat behind when the answer fails', async () => {
    const { ask, provider, supabase } = await setup();
    provider.override = (d) => ({ ...d, answer: 'See https://evil.example' });
    expect((await ask()).status).toBe(502);
    expect(supabase.db.teacher_conversations).toHaveLength(0);
    expect(supabase.db.teacher_messages).toHaveLength(0);
  });

  it('rejects unsafe follow-up questions from the provider', async () => {
    const { ask, provider } = await setup();
    provider.override = (d) => ({ ...d, followUps: ['Open https://evil.example'] });
    expect((await ask()).status).toBe(502);
  });

  it('requires authentication', async () => {
    const { app, body } = await setup();
    expect((await request(app).post('/api/v1/teacher/ask').send(body())).status).toBe(401);
  });
});

describe('usage limits', () => {
  it('stops after the daily limit, before any AI call', async () => {
    const { ask, provider } = await setup({ env: { TEACHER_DAILY_LIMIT_CHILD: '2' } });
    const first = await ask();
    expect(first.body.data.remainingToday).toBe(1);
    expect((await ask()).status).toBe(200);
    const third = await ask();
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('TEACHER_LIMIT_REACHED');
    expect(third.body.error.message).toMatch(/tomorrow/);
    expect(provider.calls).toHaveLength(2);
  });

  it('does not count answers older than a day, and counts guests separately', async () => {
    const { ask, supabase, guest, provider } = await setup({
      env: { TEACHER_DAILY_LIMIT_CHILD: '1', TEACHER_DAILY_LIMIT_GUEST: '1' },
    });
    supabase.db.usage_events.push({
      child_profile_id: CHILD,
      event_type: 'ai.teacher_answer',
      created_at: new Date(Date.now() - 2 * DAY).toISOString(),
    });
    expect((await ask()).status).toBe(200);
    expect((await ask()).status).toBe(429);
    const g = await guest();
    const body = { projectId: g.projectId, question: 'What is a variable?' };
    expect((await g.ask(body)).status).toBe(200);
    expect((await g.ask(body)).status).toBe(429);
    expect(provider.calls).toHaveLength(2);
  });

  it('blocked and invalid questions do not use up the limit', async () => {
    const { ask, body } = await setup({ env: { TEACHER_DAILY_LIMIT_CHILD: '1' } });
    await ask(body({ question: 'how do I make a bomb' }));
    await ask(body({ question: '!!' }));
    expect((await ask()).status).toBe(200);
  });
});

describe('conversations and retention', () => {
  it('stores allowed messages with an expiry and continues the same chat with history', async () => {
    const { ask, body, provider, supabase, config } = await setup();
    const first = await ask(body({ question: 'What is a variable?' }));
    const second = await ask(body({ question: 'And a function?' }));
    expect(second.body.data.conversationId).toBe(first.body.data.conversationId);
    expect(supabase.db.teacher_conversations).toHaveLength(1);
    expect(supabase.db.teacher_messages.map((m) => m.role)).toEqual([
      'child',
      'teacher',
      'child',
      'teacher',
    ]);
    const msg = supabase.db.teacher_messages[0];
    const days = (new Date(msg.expires_at).getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(config.teacher.retentionDays - 0.01);
    expect(days).toBeLessThan(config.teacher.retentionDays + 0.01);
    expect(supabase.db.teacher_messages[1].is_mock).toBe(true);
    // every column is set on every row (a bulk insert turns missing keys into NULL)
    expect(supabase.db.teacher_messages.map((m) => m.is_mock)).toEqual([false, true, false, true]);
    expect(provider.calls[1].history).toEqual([
      { role: 'child', text: 'What is a variable?' },
      { role: 'teacher', text: expect.stringContaining('Sample answer') },
    ]);
  });

  it('gives the AI at most the last 6 messages, each trimmed', async () => {
    const { ask, body, provider } = await setup();
    for (let i = 0; i < 5; i++) await ask(body({ question: `Question number ${i + 1}?` }));
    expect(provider.calls[4].history).toHaveLength(6);
    expect(provider.calls[4].history[0].text).toBe('Question number 2?');
    expect(provider.calls[4].history.every((h) => h.text.length <= 300)).toBe(true);
  });

  it('restores the latest chat with GET and clears it with DELETE', async () => {
    const { ask, asChild, app, made } = await setup();
    const sent = await ask();
    const got = await asChild(
      request(app).get(`/api/v1/teacher/conversations?projectId=${made.project.id}`),
    );
    expect(got.status).toBe(200);
    expect(got.body.data.conversationId).toBe(sent.body.data.conversationId);
    expect(got.body.data.messages).toHaveLength(2);
    expect(got.body.data.messages[1]).toMatchObject({ role: 'teacher', isMock: true });

    const del = await asChild(
      request(app).delete(`/api/v1/teacher/conversations/${sent.body.data.conversationId}`),
    );
    expect(del.body.data).toEqual({ deleted: true });
    const after = await asChild(
      request(app).get(`/api/v1/teacher/conversations?projectId=${made.project.id}`),
    );
    expect(after.body.data).toEqual({ conversationId: null, messages: [] });
  });

  it('keeps conversations private to their owner', async () => {
    const { ask, app, guest, body } = await setup();
    const sent = await ask();
    const g = await guest();
    const id = sent.body.data.conversationId;
    const del = await request(app)
      .delete(`/api/v1/teacher/conversations/${id}`)
      .set('X-Guest-Token', g.token);
    expect(del.status).toBe(404);
    const reuse = await g.ask({ ...body({ projectId: g.projectId }), conversationId: id });
    expect(reuse.status).toBe(404);
    const get = await request(app)
      .get(`/api/v1/teacher/conversations?projectId=${body().projectId}`)
      .set('X-Guest-Token', g.token);
    expect(get.status).toBe(404);
  });

  it('refuses a conversation that belongs to a different project', async () => {
    const { ask, body, supabase } = await setup();
    const sent = await ask();
    supabase.db.teacher_conversations[0].project_id = '123e4567-e89b-42d3-a456-426614174555';
    const res = await ask({ ...body(), conversationId: sent.body.data.conversationId });
    expect(res.status).toBe(404);
  });

  it('ignores expired messages and stops when a chat is full', async () => {
    const { ask, asChild, app, made, supabase, provider } = await setup();
    await ask();
    supabase.db.teacher_messages.forEach((m) => {
      m.expires_at = new Date(Date.now() - 1000).toISOString();
    });
    const got = await asChild(
      request(app).get(`/api/v1/teacher/conversations?projectId=${made.project.id}`),
    );
    expect(got.body.data.messages).toEqual([]);
    await ask();
    expect(provider.calls[1].history).toBeUndefined();

    const convo = supabase.db.teacher_conversations[0].id;
    const future = new Date(Date.now() + DAY).toISOString();
    for (let i = 0; i < 100; i++) {
      supabase.db.teacher_messages.push({
        conversation_id: convo,
        role: 'child',
        content: 'x',
        expires_at: future,
      });
    }
    const full = await ask();
    expect(full.status).toBe(409);
    expect(full.body.error.code).toBe('TEACHER_CONVERSATION_FULL');
  });

  it('purges expired messages and idle chats', async () => {
    const { ask, supabase, config } = await setup();
    await ask();
    const now = new Date(Date.now() + (config.teacher.retentionDays + 1) * DAY);
    supabase.db.teacher_messages.forEach((m) => {
      m.expires_at = new Date(Date.now() + DAY).toISOString(); // not yet expired by its own date
    });
    supabase.db.teacher_conversations[0].last_message_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    const result = await purgeExpiredTeacherData(supabase, config.teacher.retentionDays, now);
    expect(result).toEqual({ messages: 2, conversations: 1 });
    expect(supabase.db.teacher_messages).toHaveLength(0);
    expect(supabase.db.teacher_conversations).toHaveLength(0);
  });

  it('requires authentication for the chat routes', async () => {
    const { app, made } = await setup();
    expect(
      (await request(app).get(`/api/v1/teacher/conversations?projectId=${made.project.id}`)).status,
    ).toBe(401);
  });
});
