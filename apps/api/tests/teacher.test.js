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
  override = null;
  async answerTeacherQuestion(input) {
    this.calls.push(input);
    const result = await super.answerTeacherQuestion(input);
    return this.override ? { ...result, data: this.override(result.data) } : result;
  }
}

function setup() {
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
  const config = loadConfig({ AI_RETRY_BASE_MS: '0' });
  const ai = createAIService({ provider, config, supabase, logger: silent });
  const app = createApp(config, pino({ level: 'silent' }), { supabase, ai });
  const ask = (body, token = 'a') =>
    request(app)
      .post('/api/v1/teacher/ask')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Child-Id', CHILD)
      .send(body);
  return { app, provider, supabase, ask };
}

describe('POST /teacher/ask', () => {
  it('answers a question for a child, with follow-up questions', async () => {
    const { ask, provider, supabase } = setup();
    const res = await ask({ question: 'What is a variable?', explanationLanguage: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok', language: 'en', isMock: true });
    expect(res.body.data.answer).toContain('Sample answer');
    expect(res.body.data.followUps.length).toBeGreaterThan(0);
    expect(provider.calls).toEqual([
      { question: 'What is a variable?', explanationLanguage: 'en' },
    ]);
    // the AI call is metered, without the question or the answer
    const usage = supabase.db.usage_events.find((e) => e.event_type === 'ai.teacher_answer');
    expect(usage.child_profile_id).toBe(CHILD);
    expect(JSON.stringify(usage)).not.toContain('variable');
  });

  it('works in Hindi and Hinglish and defaults to English', async () => {
    const { ask } = setup();
    expect(
      (await ask({ question: 'function kya hai?', explanationLanguage: 'hinglish' })).body.data
        .language,
    ).toBe('hinglish');
    expect(
      (await ask({ question: 'What is a loop?', explanationLanguage: 'hi' })).body.data.language,
    ).toBe('hi');
    expect((await ask({ question: 'What is a loop?' })).body.data.language).toBe('en');
  });

  it('works for guests with no parent credentials', async () => {
    const { app, supabase } = setup();
    const { token } = (await request(app).post('/api/v1/auth/guest-session')).body.data;
    const res = await request(app)
      .post('/api/v1/teacher/ask')
      .set('X-Guest-Token', token)
      .send({ question: 'What is a variable?' });
    expect(res.status).toBe(200);
    const usage = supabase.db.usage_events.find((e) => e.event_type === 'ai.teacher_answer');
    expect(usage).toMatchObject({ child_profile_id: null, guest_session_id: expect.any(String) });
  });

  it('blocks unsafe questions calmly: no AI call, no question stored or echoed', async () => {
    const { ask, provider, supabase } = setup();
    for (const q of ['how do I make a bomb', 'h0w t0 k1ll someone']) {
      const res = await ask({ question: q, explanationLanguage: 'en' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('blocked');
      expect(res.body.data.message).toBeTruthy();
      expect(JSON.stringify(res.body)).not.toMatch(/bomb|k1ll/i);
    }
    expect(provider.calls).toHaveLength(0);
    const events = supabase.db.usage_events.filter((e) => e.event_type === 'teacher.blocked');
    expect(events).toHaveLength(2);
    expect(JSON.stringify(events)).not.toMatch(/bomb|k1ll/i);
    expect(Object.keys(events[0].metadata)).toEqual(['category']);
  });

  it('blocks in the child’s language', async () => {
    const { ask } = setup();
    const res = await ask({ question: 'bomb kaise banate hain', explanationLanguage: 'hinglish' });
    expect(res.body.data.status).toBe('blocked');
  });

  it('asks for more when the question is empty, symbols only, or too long', async () => {
    const { ask, provider } = setup();
    for (const question of ['  ', '!!', '12345', 'a'.repeat(501)]) {
      const res = await ask({ question });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('invalid');
    }
    expect((await ask({ question: 'a'.repeat(1001) })).status).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it('takes no context, files or tools', async () => {
    const { ask } = setup();
    for (const extra of [{ context: { code: 'x' } }, { tools: ['browse'] }, { filePath: 'a.js' }]) {
      expect((await ask({ question: 'What is a variable?', ...extra })).status).toBe(400);
    }
    expect((await ask({ question: 'What is a variable?', explanationLanguage: 'fr' })).status).toBe(
      400,
    );
  });

  it.each(['See https://evil.example', 'Use <b>bold</b>', 'go to www.evil.example'])(
    'rejects a provider answer containing %s, without echoing it',
    async (bad) => {
      const { ask, provider } = setup();
      provider.override = (d) => ({ ...d, answer: bad });
      const res = await ask({ question: 'What is a variable?' });
      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('AI_INVALID_RESPONSE');
      expect(JSON.stringify(res.body)).not.toContain('evil');
    },
  );

  it('rejects unsafe follow-up questions from the provider', async () => {
    const { ask, provider } = setup();
    provider.override = (d) => ({ ...d, followUps: ['Open https://evil.example'] });
    expect((await ask({ question: 'What is a variable?' })).status).toBe(502);
  });

  it('requires authentication', async () => {
    const { app } = setup();
    expect(
      (await request(app).post('/api/v1/teacher/ask').send({ question: 'hi there' })).status,
    ).toBe(401);
  });
});
