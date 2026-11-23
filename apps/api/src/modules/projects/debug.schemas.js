import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';

// What the preview reported. Untrusted: the API cleans it and checks it against the saved file.
export const debugBody = z
  .object({
    versionId: z.string().uuid(),
    error: z
      .object({
        kind: z.enum(['error', 'unresponsive', 'blocked']),
        name: z.string().max(40).optional(),
        message: z.string().max(1000).optional(), // cleaned and clipped to 300 by the service
        filePath: z
          .string()
          .regex(/^[A-Za-z0-9._-]{1,64}$/)
          .optional(),
        line: z.number().int().min(1).max(100000).optional(),
        column: z.number().int().min(0).max(100000).optional(),
      })
      .strict(),
    explanationLanguage: z.enum(EXPLANATION_LANGUAGES).default('en'),
  })
  .strict();
