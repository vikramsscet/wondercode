import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { PROMPT_MAX } from '../prompts/prompts.text.js';

const id = z.string().uuid();

// The browser says WHICH project and lines; it never sends code. The server reads saved files.
export const askBody = z
  .object({
    projectId: id,
    versionId: id.optional(), // default: the project's current version
    conversationId: id.optional(), // default: the latest one for this project, or a new one
    question: z.string().max(PROMPT_MAX * 2), // length is checked again after cleaning
    explanationLanguage: z.enum(EXPLANATION_LANGUAGES).default('en'),
    selection: z
      .object({
        filePath: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
        lineStart: z.number().int().min(1).max(100000),
        lineEnd: z.number().int().min(1).max(100000),
      })
      .strict()
      .refine((v) => v.lineEnd >= v.lineStart, 'lineEnd must not be before lineStart')
      .optional(),
  })
  .strict();

export const conversationsQuery = z.object({ projectId: id });
export const conversationParams = z.object({ conversationId: id });
