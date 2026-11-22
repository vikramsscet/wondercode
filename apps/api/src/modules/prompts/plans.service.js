import { AppError } from '../../utils/AppError.js';
import { analyzePrompt } from './prompts.service.js';
import { moderate } from './prompts.moderation.js';
import { PROMPT_MAX } from './prompts.text.js';

export const ALLOWED_FILES = ['index.html', 'style.css', 'script.js'];
const URL_LIKE = /(?:https?:|ftp:|www\.|\/\/[a-z0-9])/i;

// Folds the child's answers to clarifying questions into the prompt (still untrusted text).
export const mergePrompt = (prompt, answers = []) =>
  [prompt.trim(), ...answers.map((a) => a.trim())]
    .filter(Boolean)
    .join('. ')
    .slice(0, PROMPT_MAX * 2);

// Every string in the plan, for policy checks.
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

// Rules applied to any provider's plan, so a real model cannot break them (Prompt 16).
// Throws a generic error: details of what the model produced never reach the child.
export function enforcePlanPolicy(plan) {
  const text = strings({ ...plan, files: [] });
  const badFiles = plan.files.some((f) => !ALLOWED_FILES.includes(f));
  const unsafe = text.some((t) => !moderate(t).allowed || URL_LIKE.test(t));
  if (badFiles || unsafe || !plan.files.includes('index.html')) {
    throw new AppError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI helper gave an unexpected answer. Please try again.',
    );
  }
  return plan;
}

// Analyse (Prompt 15), then plan. `child` is only set for child profiles; guests get no personalisation.
export async function createPlan(
  { ai, supabase, logger },
  owner,
  { prompt, language, answers },
  child = null,
) {
  const merged = mergePrompt(prompt, answers);
  const analysis = await analyzePrompt({ supabase, logger }, owner, { prompt: merged, language });
  if (analysis.status !== 'ok') return { ...analysis, plan: null };

  const lang = language ?? analysis.language;
  const { data, meta } = await ai.generateProjectPlan(owner, {
    prompt: merged.slice(0, PROMPT_MAX),
    language: lang,
    ...(child && { age: child.age, interests: child.interests ?? [] }),
  });
  return { ...analysis, plan: enforcePlanPolicy(data), isMock: meta.isMock };
}
