import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { PROMPT_MAX } from '../prompts/prompts.text.js';

export const experimentBody = z
  .object({
    baseVersionId: z.string().uuid(), // the version the child is looking at; must still be current
    instruction: z.string().max(PROMPT_MAX * 2), // length is checked again after cleaning
    language: z.enum(EXPLANATION_LANGUAGES).default('en'),
  })
  .strict();
