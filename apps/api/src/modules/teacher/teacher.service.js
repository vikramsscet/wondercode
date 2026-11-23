import { AppError } from '../../utils/AppError.js';
import { insertUsageEvent } from '../ai/usage.repository.js';
import { isUnsafeText } from '../explanations/explanations.policy.js';
import { moderateWithHook } from '../prompts/prompts.moderation.js';
import { cleanPrompt, hasLetters, PROMPT_MAX, PROMPT_MIN } from '../prompts/prompts.text.js';

const TOO_SHORT = {
  en: 'Ask me a little more, so I can help.',
  hi: 'थोड़ा और पूछो, ताकि मैं मदद कर सकूँ।',
  hinglish: 'Thoda aur pucho, taaki main help kar sakun.',
};

async function record(supabase, logger, owner, metadata) {
  if (!supabase) return;
  try {
    await insertUsageEvent(supabase, {
      child_profile_id: owner.childProfileId ?? null,
      guest_session_id: owner.guestSessionId ?? null,
      event_type: 'teacher.blocked',
      units: 1,
      metadata,
    });
  } catch (err) {
    logger.warn?.({ err }, 'could not record teacher event'); // never break the request
  }
}

// Interim AI teacher (Prompt 26): one question in, one answer out. The question is untrusted text:
// it is cleaned and moderated first, and is never stored, logged or echoed. No project context yet
// (Prompt 27 adds context, age rules, limits and stored conversations).
export async function askTeacher(
  { supabase, ai, logger = console, moderationHook },
  owner,
  { question, explanationLanguage },
) {
  const text = cleanPrompt(question);
  if (text.length < PROMPT_MIN || !hasLetters(text) || text.length > PROMPT_MAX) {
    return { status: 'invalid', message: TOO_SHORT[explanationLanguage], followUps: [] };
  }
  const verdict = await moderateWithHook(text, explanationLanguage, moderationHook);
  if (!verdict.allowed) {
    await record(supabase, logger, owner, { category: verdict.category });
    return { status: 'blocked', message: verdict.message, followUps: [] };
  }

  const { data, meta } = await ai.answerTeacherQuestion(owner, {
    question: text,
    explanationLanguage,
  });
  // Any provider's answer must be link-free, HTML-free and pass moderation.
  if ([data.answer, ...data.followUps].some(isUnsafeText)) {
    throw new AppError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI helper gave an unexpected answer. Please try again.',
    );
  }
  return {
    status: 'ok',
    answer: data.answer,
    language: data.language,
    followUps: data.followUps,
    isMock: meta.isMock,
  };
}
