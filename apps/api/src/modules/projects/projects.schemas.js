import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { projectPlan } from '../ai/ai.schemas.js';

// The plan comes from the browser, so it is fully re-validated here and re-checked by plan policy.
export const generateBody = z
  .object({
    plan: projectPlan,
    prompt: z.string().trim().max(500).optional(),
    language: z.enum(EXPLANATION_LANGUAGES).optional(),
  })
  .strict();

export const projectIdParams = z.object({ projectId: z.string().uuid() });
