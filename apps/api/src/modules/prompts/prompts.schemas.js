import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { PROMPT_MAX } from './prompts.text.js';

// Length is checked after cleaning in the service; this only bounds the raw size.
export const analyzeBody = z
  .object({
    prompt: z.string().max(PROMPT_MAX * 2),
    language: z.enum(EXPLANATION_LANGUAGES).optional(),
  })
  .strict();
