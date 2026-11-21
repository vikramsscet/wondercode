import { createHash } from 'node:crypto';
import { MockAIProvider } from '../src/providers/ai/mock/MockAIProvider.js';
import {
  codeExplanation,
  generatedProject,
  projectPlan,
  refinedProject,
  teacherAnswer,
} from '../src/modules/ai/ai.schemas.js';
import { OPERATIONS } from '../src/providers/ai/AIProvider.js';

const mock = new MockAIProvider();
const plan = async (prompt) => (await mock.generateProjectPlan({ prompt, language: 'en' })).data;
const code = async (p) => (await mock.generateProjectCode({ plan: p, language: 'en' })).data;

describe('MockAIProvider', () => {
  it('declares itself as a mock and implements every operation', () => {
    expect(mock.name).toBe('mock');
    expect(mock.isMock).toBe(true);
    for (const op of OPERATIONS) expect(typeof mock[op]).toBe('function');
  });

  it('is deterministic', async () => {
    expect(await plan('make a game')).toEqual(await plan('make a game'));
  });

  it.each([
    ['Make a game where a cat catches stars', 'game'],
    ['Create a quiz about animals', 'quiz'],
    ['Create a calculator', 'calculator'],
    ['Make a shape dance', 'animation'],
    ['a page about my dog', 'webpage'],
    ['मुझे एक खेल बनाना है', 'game'],
    ['ek quiz banao', 'quiz'],
  ])('plans "%s" as %s and the plan matches the schema', async (prompt, type) => {
    const result = await plan(prompt);
    expect(result.projectType).toBe(type);
    expect(projectPlan.safeParse(result).success).toBe(true);
  });

  it.each(['game', 'quiz', 'calculator', 'animation', 'webpage'])(
    'generates a valid %s project with runnable, self-contained code',
    async (type) => {
      const project = await code(await plan(`make a ${type}`.replace('webpage', 'page')));
      expect(generatedProject.safeParse(project).success).toBe(true);
      expect(project.files.map((f) => f.path)).toEqual(['index.html', 'style.css', 'script.js']);

      const all = project.files.map((f) => f.content).join('\n');
      expect(all).not.toMatch(/https?:\/\//); // no external scripts, styles or fonts
      expect(all).not.toMatch(/\b(fetch|XMLHttpRequest|eval|localStorage|document\.cookie)\b/);

      const js = project.files.find((f) => f.path === 'script.js').content;
      expect(() => new Function(js)).not.toThrow(); // valid JavaScript syntax
      const html = project.files.find((f) => f.path === 'index.html').content;
      expect(html).toContain('href="style.css"');
      expect(html).toContain('src="script.js"');
    },
  );

  it('explains the selected lines and binds the explanation to their hash', async () => {
    const source = 'let score = 0;\nconst name = "x";\nfunction hi() {}\n';
    const { data } = await mock.explainCode({
      filePath: 'script.js',
      code: source,
      lineStart: 1,
      lineEnd: 1,
      explanationLanguage: 'en',
    });
    expect(codeExplanation.safeParse(data).success).toBe(true);
    expect(data.concept).toBe('variable');
    expect(data.codeHash).toBe(createHash('sha256').update('let score = 0;').digest('hex'));
    expect(data.explanation.hi).toMatch(/[ऀ-ॿ]/); // Hindi script
    expect(data.explanation.hinglish).not.toMatch(/[ऀ-ॿ]/);
  });

  it('clamps out-of-range lines and picks concepts by file type', async () => {
    const { data } = await mock.explainCode({
      filePath: 'style.css',
      code: 'body { color: red; }',
      lineStart: 1,
      lineEnd: 99,
      explanationLanguage: 'en',
    });
    expect(data.lineEnd).toBe(1);
    expect(data.concept).toBe('CSS rule');
  });

  it('refines by adding a visible change and keeps other files untouched', async () => {
    const project = await code(await plan('make a game'));
    const { data } = await mock.refineProject({
      files: project.files,
      instruction: 'make the background blue',
      language: 'en',
    });
    expect(refinedProject.safeParse(data).success).toBe(true);
    const css = data.files.find((f) => f.path === 'style.css').content;
    expect(css).toContain('#3b82f6');
    expect(data.files.find((f) => f.path === 'index.html')).toEqual(
      project.files.find((f) => f.path === 'index.html'),
    );
    expect(data.changes).toHaveLength(1);
  });

  it('answers in the requested language and labels itself as a sample', async () => {
    for (const language of ['en', 'hi', 'hinglish']) {
      const { data } = await mock.answerTeacherQuestion({
        question: 'What is a variable?',
        explanationLanguage: language,
      });
      expect(teacherAnswer.safeParse(data).success).toBe(true);
      expect(data.language).toBe(language);
    }
    const { data } = await mock.answerTeacherQuestion({ question: 'x', explanationLanguage: 'en' });
    expect(data.answer).toContain('Sample answer');
  });

  it('reports token usage', async () => {
    const { usage, model } = await mock.generateProjectPlan({ prompt: 'a game', language: 'en' });
    expect(model).toBe('mock-1');
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
  });
});
