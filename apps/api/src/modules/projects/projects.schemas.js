import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';
import { projectFile, projectPlan } from '../ai/ai.schemas.js';

// The plan comes from the browser, so it is fully re-validated here and re-checked by plan policy.
export const generateBody = z
  .object({
    plan: projectPlan,
    prompt: z.string().trim().max(500).optional(),
    language: z.enum(EXPLANATION_LANGUAGES).optional(),
  })
  .strict();

export const projectIdParams = z.object({ projectId: z.string().uuid() });

// Up to 100 KB of JSON in total (the API-wide request limit); validation reports problems, it does not save.
export const validateBody = z.object({ files: z.array(projectFile).min(1).max(10) }).strict();
