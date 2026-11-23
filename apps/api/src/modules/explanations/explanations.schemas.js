import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';

export const MAX_EXPLAIN_LINES = 40;

export const explainBody = z
  .object({
    versionId: z.string().uuid(),
    filePath: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/),
    lineStart: z.number().int().min(1).max(100000),
    lineEnd: z.number().int().min(1).max(100000),
    codeHash: z.string().regex(/^[0-9a-f]{64}$/), // sha-256 of exactly the selected lines
    explanationLanguage: z.enum(EXPLANATION_LANGUAGES).default('en'),
  })
  .strict()
  .refine((v) => v.lineEnd >= v.lineStart, 'lineEnd must not be before lineStart');

export const listQuery = z.object({ versionId: z.string().uuid().optional() });
