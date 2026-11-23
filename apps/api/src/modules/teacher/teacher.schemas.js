import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { PROMPT_MAX } from '../prompts/prompts.text.js';

// Interim body (Prompt 26): a question and a language. No project context, no files, no tools.
export const askBody = z
  .object({
    question: z.string().max(PROMPT_MAX * 2), // length is checked again after cleaning
    explanationLanguage: z.enum(EXPLANATION_LANGUAGES).default('en'),
  })
  .strict();
