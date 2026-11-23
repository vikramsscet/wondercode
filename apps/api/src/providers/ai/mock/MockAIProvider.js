import { createHash } from 'node:crypto';
import { AIProvider } from '../AIProvider.js';
import {
  COLOURS,
  CONCEPTS,
  PLAN_DETAILS,
  TEMPLATES,
  VISUALS,
  debugFor,
  detectConcept,
  detectType,
  languageOf,
} from './templates.js';

const MODEL = 'mock-1';
const estimate = (...parts) => Math.ceil(parts.join(' ').length / 4); // rough token estimate
const done = (data, input) => ({
  data,
  model: MODEL,
  usage: {
    inputTokens: estimate(JSON.stringify(input)),
    outputTokens: estimate(JSON.stringify(data)),
  },
});

// Returns canned, deterministic sample output. No network, no API key. The same input always gives
// the same output. AIService labels every response from this provider as a mock (meta.isMock).
export class MockAIProvider extends AIProvider {
  name = 'mock';
  isMock = true;

  async generateProjectPlan(input) {
    const type = detectType(input.prompt);
    const template = TEMPLATES[type];
    return done(
      {
        title: template.title,
        description: template.description,
        projectType: type,
        features: template.features,
        interaction: PLAN_DETAILS[type].interaction,
        expectedBehaviour: PLAN_DETAILS[type].expectedBehaviour,
        files: Object.keys(template.files),
        learningConcepts: template.concepts,
        childSummary: template.summary,
      },
      input,
    );
  }

  async generateProjectCode(input) {
    const template = TEMPLATES[input.plan.projectType] ?? TEMPLATES.webpage;
    return done(
      {
        project: {
          title: input.plan.title,
          runtime: 'browser',
          languageSet: ['html', 'css', 'javascript'],
        },
        files: Object.entries(template.files).map(([path, content]) => ({
          path,
          language: languageOf(path),
          content,
        })),
        learningConcepts: input.plan.learningConcepts,
      },
      input,
    );
  }

  async explainCode(input) {
    const lines = input.code.split('\n');
    const lineEnd = Math.min(input.lineEnd, lines.length);
    const lineStart = Math.min(input.lineStart, lineEnd);
    const snippet = lines.slice(lineStart - 1, lineEnd).join('\n');
    const key = detectConcept(input.filePath, snippet);
    const concept = CONCEPTS[key];
    return done(
      {
        filePath: input.filePath,
        lineStart,
        lineEnd,
        // The hash binds the explanation to the exact code that was explained.
        codeHash: createHash('sha256').update(snippet).digest('hex'),
        concept: concept.name,
        explanation: concept.explanation,
        realLifeExample: concept.example,
        tryThis: concept.tryThis,
        visual: VISUALS[key],
      },
      input,
    );
  }

  async refineProject(input) {
    const colour = Object.entries(COLOURS).find(([word]) =>
      input.instruction.toLowerCase().includes(word),
    );
    const target =
      input.files.find((f) => f.language === 'css') ??
      input.files.find((f) => f.language === 'javascript') ??
      input.files[0];
    const addition = colour
      ? `\n/* Sample update: new background colour */\nbody {\n  background: ${colour[1]};\n}\n`
      : '\n/* Sample update from WonderCode (mock) */\n';
    const comment =
      target.language === 'css' ? addition : addition.replaceAll('/*', '//').replaceAll('*/', '');
    const summary = colour
      ? {
          en: 'Changed the page background to a new colour.',
          hi: 'पेज का बैकग्राउंड नए रंग में बदल दिया।',
          hinglish: 'Page ka background naye colour mein badal diya.',
        }
      : {
          en: 'Added a small note to show where a change can go.',
          hi: 'एक छोटा नोट जोड़ा जो दिखाता है कि बदलाव कहाँ जा सकता है।',
          hinglish: 'Ek chhota note joda jo dikhata hai ki badlaav kahan ja sakta hai.',
        };
    return done(
      {
        files: input.files.map((f) =>
          f.path === target.path ? { ...f, content: f.content + comment } : f,
        ),
        changes: [{ path: target.path, summary }],
      },
      input,
    );
  }

  async answerTeacherQuestion(input) {
    const snippet = input.context?.code ?? '';
    const where = input.context?.filePath
      ? ` (${input.context.filePath}${input.context.lineStart ? `, ${input.context.lineStart === input.context.lineEnd ? 'line' : 'lines'} ${input.context.lineStart}${input.context.lineEnd > input.context.lineStart ? `-${input.context.lineEnd}` : ''}` : ''})`
      : '';
    const key = detectConcept(input.context?.filePath ?? '', snippet);
    const concept = CONCEPTS[key];
    const lead = {
      en: 'Great question! (Sample answer)',
      hi: 'बहुत अच्छा सवाल! (नमूना जवाब)',
      hinglish: 'Bahut accha sawaal! (Sample answer)',
    }[input.explanationLanguage];
    return done(
      {
        answer: `${lead}${where} ${concept.explanation[input.explanationLanguage]} ${concept.example[input.explanationLanguage]}`,
        language: input.explanationLanguage,
        followUps: [concept.tryThis, 'Can you explain it back in your own words?'],
        visual: VISUALS[key],
      },
      input,
    );
  }

  async debugError(input) {
    return done(debugFor(input), input);
  }
}
