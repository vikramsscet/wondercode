import { insertUsageEvent } from '../ai/usage.repository.js';
import { cleanPrompt, hasLetters, PROMPT_MIN } from './prompts.text.js';
import { moderateWithHook } from './prompts.moderation.js';
import { understand } from './prompts.understanding.js';

const INVALID = {
  en: 'Tell me a little more about what you want to build.',
  hi: 'थोड़ा और बताओ कि तुम क्या बनाना चाहते हो।',
  hinglish: 'Thoda aur batao ki tum kya banana chahte ho.',
};

// Analyses a prompt (no AI call, no code generation). `owner` is { childProfileId } or { guestSessionId }.
// Blocked prompts are logged by category only; the prompt text is never stored or echoed.
export async function analyzePrompt(
  { supabase, logger = console, moderationHook },
  owner,
  { prompt, language },
) {
  const text = cleanPrompt(prompt);
  const detected = understand(text, language);
  const reply = language ?? detected.language;

  if (text.length < PROMPT_MIN || !hasLetters(text)) {
    return {
      status: 'needs_clarification',
      projectType: null,
      language: detected.language,
      message: INVALID[reply],
      questions: understand('', reply).questions,
    };
  }

  const verdict = await moderateWithHook(text, reply, moderationHook);
  if (!verdict.allowed) {
    await record(supabase, logger, owner, 'prompt.blocked', { category: verdict.category });
    return {
      status: 'blocked',
      projectType: null,
      language: detected.language,
      category: verdict.category,
      message: verdict.message,
      questions: [],
    };
  }

  const ready = detected.questions.length === 0;
  await record(supabase, logger, owner, 'prompt.analyzed', {
    ready,
    projectType: detected.projectType,
  });
  return {
    status: ready ? 'ok' : 'needs_clarification',
    projectType: detected.projectType,
    language: detected.language,
    message: null,
    questions: detected.questions,
  };
}

async function record(supabase, logger, owner, event, metadata) {
  if (!supabase) return;
  try {
    await insertUsageEvent(supabase, {
      child_profile_id: owner.childProfileId ?? null,
      guest_session_id: owner.guestSessionId ?? null,
      event_type: event,
      units: 1,
      metadata,
    });
  } catch (err) {
    logger.warn?.({ err }, 'could not record prompt event'); // never break the request
  }
}
