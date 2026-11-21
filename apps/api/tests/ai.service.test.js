import { loadConfig } from '../src/config/env.js';
import { createAIService } from '../src/modules/ai/ai.service.js';
import { AIProvider } from '../src/providers/ai/AIProvider.js';
import { AIProviderError } from '../src/providers/ai/errors.js';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import { createAIProvider } from '../src/providers/ai/registry.js';
import { createFakeSupabase } from './helpers/fakeSupabase.js';

const config = (env = {}) => loadConfig({ AI_RETRY_BASE_MS: '0', AI_TIMEOUT_MS: '200', ...env });
const silent = { warn() {}, info() {}, error() {} };
const CHILD = { childProfileId: '123e4567-e89b-42d3-a456-426614174001' };
const GUEST = { guestSessionId: '123e4567-e89b-42d3-a456-426614174002' };
const VALID_PLAN = new MockAIProvider().generateProjectPlan({ prompt: 'game', language: 'en' });

// A provider whose plan generation is scripted: each step is a function returning a result or throwing.
class ScriptedProvider extends AIProvider {
  name = 'scripted';
  isMock = false;
  calls = 0;
  constructor(steps) {
    super();
    this.steps = steps;
  }
  async generateProjectPlan(input, options) {
    const step = this.steps[Math.min(this.calls, this.steps.length - 1)];
    this.calls += 1;
    return step(input, options);
  }
}
const good = async () => ({ ...(await VALID_PLAN), model: 'test-model' });

function build(provider, env, supabase = null) {
  return createAIService({ provider, config: config(env), supabase, logger: silent });
}

describe('AIService with the mock provider', () => {
  it('labels responses as mock and returns schema-valid data', async () => {
    const ai = build(new MockAIProvider());
    const res = await ai.generateProjectPlan(CHILD, { prompt: 'make a game' });
    expect(res.meta).toEqual({ provider: 'mock', model: 'mock-1', isMock: true });
    expect(res.data.projectType).toBe('game');
  });

  it('runs the whole flow plan -> code -> explain -> refine -> teacher', async () => {
    const ai = build(new MockAIProvider());
    const { data: plan } = await ai.generateProjectPlan(CHILD, { prompt: 'make a quiz' });
    const { data: project } = await ai.generateProjectCode(CHILD, { plan });
    const script = project.files.find((f) => f.path === 'script.js');
    const explained = await ai.explainCode(CHILD, {
      filePath: 'script.js',
      code: script.content,
      lineStart: 1,
      lineEnd: 2,
      explanationLanguage: 'hinglish',
    });
    expect(explained.data.codeHash).toMatch(/^[0-9a-f]{64}$/);
    const refined = await ai.refineProject(CHILD, {
      files: project.files,
      instruction: 'make it green',
    });
    expect(refined.data.files).toHaveLength(project.files.length);
    const answer = await ai.answerTeacherQuestion(CHILD, {
      question: 'What does this do?',
      explanationLanguage: 'hi',
    });
    expect(answer.meta.isMock).toBe(true);
  });

  it('rejects invalid input before calling the provider', async () => {
    const provider = new ScriptedProvider([good]);
    const ai = build(provider);
    for (const bad of [
      {},
      { prompt: '' },
      { prompt: 'x'.repeat(501) },
      { prompt: 'ok', extra: 1 },
      { prompt: 'ok', language: 'fr' },
    ]) {
      await expect(ai.generateProjectPlan(CHILD, bad)).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
      });
    }
    expect(provider.calls).toBe(0);
  });

  it('requires exactly one owner', async () => {
    const ai = build(new MockAIProvider());
    await expect(ai.generateProjectPlan({}, { prompt: 'x' })).rejects.toThrow(/exactly one owner/);
    await expect(ai.generateProjectPlan({ ...CHILD, ...GUEST }, { prompt: 'x' })).rejects.toThrow(
      /exactly one owner/,
    );
  });
});

describe('AIService reliability', () => {
  it('retries transient provider errors and then succeeds', async () => {
    const flaky = async () => {
      throw new AIProviderError('503', { retryable: true });
    };
    const provider = new ScriptedProvider([flaky, flaky, good]);
    const res = await build(provider, { AI_MAX_RETRIES: '2' }).generateProjectPlan(CHILD, {
      prompt: 'x',
    });
    expect(res.data.title).toBeTruthy();
    expect(provider.calls).toBe(3);
  });

  it('gives up after the bounded number of retries with a generic error', async () => {
    const down = async () => {
      throw new AIProviderError('secret vendor detail 503 key=abc', { retryable: true });
    };
    const provider = new ScriptedProvider([down]);
    const err = await build(provider, { AI_MAX_RETRIES: '2' })
      .generateProjectPlan(CHILD, { prompt: 'x' })
      .catch((e) => e);
    expect(provider.calls).toBe(3); // 1 try + 2 retries
    expect(err).toMatchObject({ status: 502, code: 'AI_UNAVAILABLE' });
    expect(err.message).not.toMatch(/secret|key=abc|503/);
  });

  it('does not retry non-retryable errors', async () => {
    const provider = new ScriptedProvider([
      async () => {
        throw new AIProviderError('bad key');
      },
    ]);
    await expect(build(provider).generateProjectPlan(CHILD, { prompt: 'x' })).rejects.toMatchObject(
      { code: 'AI_UNAVAILABLE' },
    );
    expect(provider.calls).toBe(1);
  });

  it('treats unexpected exceptions as unavailable without leaking them', async () => {
    const provider = new ScriptedProvider([
      async () => {
        throw new TypeError('db password is hunter2');
      },
    ]);
    const err = await build(provider)
      .generateProjectPlan(CHILD, { prompt: 'x' })
      .catch((e) => e);
    expect(err.code).toBe('AI_UNAVAILABLE');
    expect(err.message).not.toContain('hunter2');
    expect(provider.calls).toBe(1);
  });

  it('times out slow providers, aborts them and retries', async () => {
    let aborted = false;
    const slow = (_input, { signal }) =>
      new Promise((resolve) => {
        signal.addEventListener('abort', () => {
          aborted = true;
        });
        setTimeout(resolve, 5000);
      });
    const provider = new ScriptedProvider([slow]);
    const err = await build(provider, { AI_TIMEOUT_MS: '30', AI_MAX_RETRIES: '1' })
      .generateProjectPlan(CHILD, { prompt: 'x' })
      .catch((e) => e);
    expect(err).toMatchObject({ status: 504, code: 'AI_TIMEOUT' });
    expect(aborted).toBe(true);
    expect(provider.calls).toBe(2);
  });

  it('rejects output that does not match the schema, retrying first', async () => {
    const garbage = async () => ({ data: { title: 'only a title' }, model: 'x', usage: {} });
    const provider = new ScriptedProvider([garbage, good]);
    const res = await build(provider).generateProjectPlan(CHILD, { prompt: 'x' });
    expect(res.data.files.length).toBeGreaterThan(0);
    expect(provider.calls).toBe(2);

    const alwaysBad = new ScriptedProvider([garbage]);
    await expect(
      build(alwaysBad, { AI_MAX_RETRIES: '1' }).generateProjectPlan(CHILD, { prompt: 'x' }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'AI_INVALID_RESPONSE',
    });
    expect(alwaysBad.calls).toBe(2);
  });

  it('reports a provider that does not implement an operation as unavailable', async () => {
    const ai = build(
      new (class extends AIProvider {
        name = 'partial';
      })(),
    );
    await expect(ai.generateProjectPlan(CHILD, { prompt: 'x' })).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
    });
  });
});

describe('AI usage tracking', () => {
  const eventsOf = (sb) => (sb.db.usage_events ??= []);

  it('records one usage event per call for a child, without any content', async () => {
    const sb = createFakeSupabase({ tables: { usage_events: [] } });
    const ai = build(new MockAIProvider(), {}, sb);
    await ai.generateProjectPlan(CHILD, { prompt: 'a very private idea about my school' });
    const [event] = eventsOf(sb);
    expect(event).toMatchObject({
      child_profile_id: CHILD.childProfileId,
      guest_session_id: null,
      event_type: 'ai.project_plan',
      units: 1,
    });
    expect(event.metadata).toMatchObject({
      provider: 'mock',
      model: 'mock-1',
      isMock: true,
      attempts: 1,
    });
    expect(event.metadata.inputTokens).toBeGreaterThan(0);
    expect(JSON.stringify(event)).not.toMatch(/private|school|Star Catcher/);
  });

  it('records guest usage against the guest session', async () => {
    const sb = createFakeSupabase({ tables: { usage_events: [] } });
    await build(new MockAIProvider(), {}, sb).answerTeacherQuestion(GUEST, { question: 'hi' });
    expect(eventsOf(sb)[0]).toMatchObject({
      guest_session_id: GUEST.guestSessionId,
      child_profile_id: null,
      event_type: 'ai.teacher_answer',
    });
  });

  it('records the number of attempts and nothing for failed calls', async () => {
    const sb = createFakeSupabase({ tables: { usage_events: [] } });
    const flaky = async () => {
      throw new AIProviderError('x', { retryable: true });
    };
    await build(new ScriptedProvider([flaky, good]), {}, sb).generateProjectPlan(CHILD, {
      prompt: 'x',
    });
    expect(eventsOf(sb)[0].metadata.attempts).toBe(2);

    const sb2 = createFakeSupabase({ tables: { usage_events: [] } });
    await build(
      new ScriptedProvider([
        async () => {
          throw new AIProviderError('x');
        },
      ]),
      {},
      sb2,
    )
      .generateProjectPlan(CHILD, { prompt: 'x' })
      .catch(() => {});
    expect(eventsOf(sb2)).toHaveLength(0);
  });

  it('never fails the request when metering fails', async () => {
    const sb = { from: () => ({ insert: async () => ({ error: new Error('db down') }) }) };
    const res = await build(new MockAIProvider(), {}, sb).generateProjectPlan(CHILD, {
      prompt: 'x',
    });
    expect(res.data.title).toBeTruthy();
  });
});

describe('provider registry and config', () => {
  it('defaults to the mock provider without any key', () => {
    const cfg = loadConfig({});
    expect(cfg.ai.provider).toBe('mock');
    expect(createAIProvider(cfg).isMock).toBe(true);
  });

  it('fails fast for reserved providers without an adapter', () => {
    for (const name of ['openai', 'gemini', 'anthropic']) {
      expect(() => createAIProvider(loadConfig({ AI_PROVIDER: name }))).toThrow(
        /not implemented yet/,
      );
    }
  });

  it('rejects unknown provider names and bad numbers', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'skynet' })).toThrow(/Invalid AI_PROVIDER/);
    expect(() => loadConfig({ AI_TIMEOUT_MS: '0' })).toThrow(/AI_TIMEOUT_MS/);
    expect(() => loadConfig({ AI_MAX_RETRIES: '-1' })).toThrow(/AI_MAX_RETRIES/);
  });

  it('lets a new provider be added by registering one factory', () => {
    const fake = new ScriptedProvider([good]);
    const provider = createAIProvider(loadConfig({ AI_PROVIDER: 'openai' }), {
      openai: () => fake,
    });
    expect(provider).toBe(fake);
  });
});
