import { z } from 'zod';
import { EXPLANATION_LANGUAGES } from '@wondercode/shared';

// ----- shared pieces -----
const language = z.enum(EXPLANATION_LANGUAGES);
const text = (max) => z.string().trim().min(1).max(max);
const localized = (max) => z.object({ en: text(max), hi: text(max), hinglish: text(max) });
const filePath = z.string().regex(/^[A-Za-z0-9._-]{1,64}$/); // flat file names only
const MAX_FILE_BYTES = 200 * 1024;

export const projectFile = z.object({
  path: filePath,
  language: z.enum(['html', 'css', 'javascript']),
  content: z.string().max(MAX_FILE_BYTES),
});
const files = z.array(projectFile).min(1).max(10);

const PROJECT_TYPES = ['game', 'quiz', 'calculator', 'animation', 'webpage'];

// ----- outputs (what a provider must return) -----
export const projectPlan = z.object({
  title: text(80),
  description: text(300),
  projectType: z.enum(PROJECT_TYPES),
  features: z.array(text(120)).min(1).max(8),
  files: z.array(filePath).min(1).max(10),
  learningConcepts: z.array(text(60)).min(1).max(10),
  childSummary: localized(300),
});

export const generatedProject = z.object({
  project: z.object({
    title: text(80),
    runtime: z.literal('browser'),
    languageSet: z.array(z.enum(['html', 'css', 'javascript'])).min(1),
  }),
  files,
  learningConcepts: z.array(text(60)).max(10),
});

export const codeExplanation = z.object({
  filePath,
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  codeHash: z.string().regex(/^[0-9a-f]{64}$/),
  concept: text(60),
  explanation: localized(600),
  realLifeExample: localized(300),
  tryThis: text(300),
});

export const refinedProject = z.object({
  files,
  changes: z
    .array(z.object({ path: filePath, summary: localized(300) }))
    .min(1)
    .max(10),
});

export const teacherAnswer = z.object({
  answer: text(1500),
  language,
  followUps: z.array(text(120)).max(4),
});

// ----- inputs (what callers pass to AIService) -----
export const planInput = z.object({ prompt: text(500), language: language.default('en') }).strict();

export const codeInput = z.object({ plan: projectPlan, language: language.default('en') }).strict();

export const explainInput = z
  .object({
    filePath,
    code: z.string().min(1).max(MAX_FILE_BYTES), // the whole file; lines are 1-based
    lineStart: z.number().int().min(1),
    lineEnd: z.number().int().min(1),
    explanationLanguage: language.default('en'),
  })
  .strict()
  .refine((v) => v.lineEnd >= v.lineStart, 'lineEnd must not be before lineStart');

export const refineInput = z
  .object({ files, instruction: text(500), language: language.default('en') })
  .strict();

export const teacherInput = z
  .object({
    question: text(500),
    explanationLanguage: language.default('en'),
    context: z
      .object({ filePath: filePath.optional(), code: z.string().max(MAX_FILE_BYTES).optional() })
      .optional(),
  })
  .strict();

// operation name -> { input, output }
export const OPERATION_SCHEMAS = {
  generateProjectPlan: { input: planInput, output: projectPlan, event: 'ai.project_plan' },
  generateProjectCode: { input: codeInput, output: generatedProject, event: 'ai.project_code' },
  explainCode: { input: explainInput, output: codeExplanation, event: 'ai.explain_code' },
  refineProject: { input: refineInput, output: refinedProject, event: 'ai.refine_project' },
  answerTeacherQuestion: { input: teacherInput, output: teacherAnswer, event: 'ai.teacher_answer' },
};
