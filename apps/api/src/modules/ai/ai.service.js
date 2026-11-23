import { AppError } from '../../utils/AppError.js';
import { AIProviderError } from '../../providers/ai/errors.js';
import { OPERATION_SCHEMAS } from './ai.schemas.js';
import { insertUsageEvent } from './usage.repository.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AITimeout extends Error {}
class AIInvalidOutput extends Error {}

// Runs `fn` with an AbortSignal that fires after `ms`; also stops waiting for a provider that ignores it.
async function withTimeout(fn, ms) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AITimeout());
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// The single entry point for AI features. It is provider independent: it only uses the AIProvider
// interface, so swapping providers needs no change here or in any feature code.
export function createAIService({ provider, config, supabase = null, logger = console }) {
  const { timeoutMs, maxRetries, retryBaseMs } = config.ai;

  async function record(owner, event, meta) {
    if (!supabase) return;
    try {
      await insertUsageEvent(supabase, {
        child_profile_id: owner.childProfileId ?? null,
        guest_session_id: owner.guestSessionId ?? null,
        event_type: event,
        units: 1,
        metadata: meta,
      });
    } catch (err) {
      logger.warn?.({ err }, 'could not record AI usage'); // metering must never break the request
    }
  }

  async function run(operation, owner, rawInput) {
    const schemas = OPERATION_SCHEMAS[operation];
    if (!schemas) throw new Error(`Unknown AI operation: ${operation}`);
    if (!owner?.childProfileId === !owner?.guestSessionId) {
      throw new Error('AI calls need exactly one owner: childProfileId or guestSessionId');
    }

    const parsed = schemas.input.safeParse(rawInput);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'The request could not be processed.',
        parsed.error.issues.map((i) => ({
          in: 'body',
          field: i.path.join('.'),
          message: i.message,
        })),
      );
    }

    let attempts = 0;
    let lastError;
    while (attempts <= maxRetries) {
      attempts += 1;
      try {
        const result = await withTimeout(
          (signal) => provider[operation](parsed.data, { signal }),
          timeoutMs,
        );
        const output = schemas.output.safeParse(result?.data);
        if (!output.success) throw new AIInvalidOutput();

        const meta = {
          provider: provider.name,
          model: result.model ?? config.ai.model ?? '',
          isMock: provider.isMock,
        };
        await record(owner, schemas.event, {
          ...meta,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          attempts,
        });
        return { data: output.data, meta };
      } catch (err) {
        lastError = err;
        const retryable =
          err instanceof AITimeout ||
          err instanceof AIInvalidOutput ||
          (err instanceof AIProviderError && err.retryable);
        logger.warn?.({ operation, attempts, kind: err?.name }, 'AI call failed');
        if (!retryable || attempts > maxRetries) break;
        await sleep(retryBaseMs * 2 ** (attempts - 1));
      }
    }

    // Generic messages only: provider details never reach clients.
    if (lastError instanceof AITimeout) {
      throw new AppError(504, 'AI_TIMEOUT', 'The AI helper took too long. Please try again.');
    }
    if (lastError instanceof AIInvalidOutput) {
      throw new AppError(
        502,
        'AI_INVALID_RESPONSE',
        'The AI helper gave an unexpected answer. Please try again.',
      );
    }
    throw new AppError(
      502,
      'AI_UNAVAILABLE',
      'The AI helper is not available right now. Please try again.',
    );
  }

  const operation = (name) => (owner, input) => run(name, owner, input);
  return {
    provider: { name: provider.name, isMock: provider.isMock },
    generateProjectPlan: operation('generateProjectPlan'),
    generateProjectCode: operation('generateProjectCode'),
    explainCode: operation('explainCode'),
    refineProject: operation('refineProject'),
    answerTeacherQuestion: operation('answerTeacherQuestion'),
    debugError: operation('debugError'),
  };
}
