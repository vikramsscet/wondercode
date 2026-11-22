// Understands what a child wants: language, project type and missing details. No AI call, no code.
export const PROJECT_TYPES = ['game', 'quiz', 'calculator', 'animation', 'webpage'];

const TYPE_WORDS = {
  quiz: ['quiz', 'trivia', 'questions?', 'sawaal', 'prashn', 'क्विज़', 'क्विज', 'सवाल', 'प्रश्न'],
  calculator: [
    'calculator',
    'calculate',
    'add(?:ition)?',
    'subtract\\w*',
    'multiply',
    'divide',
    'math',
    'converter',
    'कैलकुलेटर',
    'जोड़',
    'हिसाब',
  ],
  animation: [
    'animation',
    'animate\\w*',
    'moving',
    'bouncing',
    'fireworks',
    'dancing',
    'floating',
    'एनिमेशन',
    'चलता',
  ],
  webpage: [
    'web ?page',
    'website',
    'site',
    'about me',
    'portfolio',
    'page',
    'profile',
    'वेबपेज',
    'वेबसाइट',
    'पेज',
  ],
  game: [
    'game',
    'play',
    'catch',
    'snake',
    'race',
    'racing',
    'maze',
    'puzzle',
    'jump',
    'shoot\\w*',
    'dodge',
    'memory',
    'khel',
    'गेम',
    'खेल',
  ],
};
const wordRe = (words) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join('|')})(?![\\p{L}\\p{N}])`, 'iu');
const TYPE_RES = Object.fromEntries(Object.entries(TYPE_WORDS).map(([k, v]) => [k, wordRe(v)]));
// Specific kinds win over the generic "game"/"webpage" words.
const TYPE_ORDER = ['quiz', 'calculator', 'animation', 'game', 'webpage'];

export function detectProjectType(text) {
  return TYPE_ORDER.find((t) => TYPE_RES[t].test(text)) ?? null;
}

const HINGLISH = wordRe([
  'banao',
  'bana',
  'banana',
  'mujhe',
  'mera',
  'meri',
  'chahiye',
  'hai',
  'ek',
  'wala',
  'wali',
  'khel',
  'kaise',
  'karo',
  'aur',
  'ka',
  'ki',
  'ke',
  'sawaal',
  'mein',
  'se',
  'ko',
  'nahi',
  'tum',
  'hum',
]);

// 'hi' for Devanagari, 'hinglish' for romanised Hindi words, otherwise 'en'.
export function detectLanguage(text) {
  const letters = text.match(/\p{L}/gu) ?? [];
  const deva = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  if (letters.length && deva / letters.length > 0.3) return 'hi';
  const hits = (text.match(new RegExp(HINGLISH.source, 'giu')) ?? []).length;
  return hits >= 2 ? 'hinglish' : 'en';
}

const QUESTIONS = {
  type: {
    en: 'What would you like to make?',
    hi: 'तुम क्या बनाना चाहते हो?',
    hinglish: 'Tum kya banana chahte ho?',
  },
  quizTopic: {
    en: 'What should the quiz be about?',
    hi: 'क्विज़ किस बारे में होना चाहिए?',
    hinglish: 'Quiz kis topic par hona chahiye?',
  },
  gameTheme: {
    en: 'What is the game about? For example catching stars or a maze.',
    hi: 'गेम किस बारे में है? जैसे तारे पकड़ना या भूलभुलैया।',
    hinglish: 'Game kis baare mein hai? Jaise stars pakadna ya maze.',
  },
  calcKind: {
    en: 'What should the calculator do? For example add numbers or convert units.',
    hi: 'कैलकुलेटर क्या करे? जैसे संख्याएँ जोड़ना या यूनिट बदलना।',
    hinglish: 'Calculator kya kare? Jaise numbers add karna ya units convert karna.',
  },
  animationSubject: {
    en: 'What should move or change in the animation?',
    hi: 'एनिमेशन में क्या चले या बदले?',
    hinglish: 'Animation mein kya move ya change ho?',
  },
  pageTopic: {
    en: 'What is the webpage about?',
    hi: 'वेबपेज किस बारे में है?',
    hinglish: 'Webpage kis baare mein hai?',
  },
};

export const TYPE_SUGGESTIONS = PROJECT_TYPES;

// Words that carry no topic by themselves.
const FILLER = wordRe([
  'a',
  'an',
  'the',
  'make',
  'build',
  'create',
  'me',
  'my',
  'please',
  'i',
  'want',
  'to',
  'can',
  'you',
  'new',
  'simple',
  'small',
  'cool',
  'fun',
  'some',
  'for',
  'of',
  'about',
  'one',
  'banao',
  'bana',
  'ek',
  'mujhe',
  'chahiye',
  'hai',
  'ka',
  'ki',
  'ke',
  'wala',
  'बनाओ',
  'एक',
  'मुझे',
  'चाहिए',
  'का',
  'की',
  'के',
  ...Object.values(TYPE_WORDS).flat(),
]);

// How many meaningful topic words remain once filler and project-type words are removed.
const topicWordCount = (text) =>
  text
    .replace(new RegExp(FILLER.source, 'giu'), ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 2).length;

const TOPIC_QUESTION = {
  quiz: 'quizTopic',
  game: 'gameTheme',
  calculator: 'calcKind',
  animation: 'animationSubject',
  webpage: 'pageTopic',
};

// Returns { projectType, language, questions: [{ text, suggestions }] } (at most 2 questions).
export function understand(text, preferredLanguage) {
  const language = detectLanguage(text);
  const reply = preferredLanguage ?? language;
  const projectType = detectProjectType(text);
  const questions = [];
  if (!projectType) {
    questions.push({ text: QUESTIONS.type[reply], suggestions: TYPE_SUGGESTIONS });
  } else if (topicWordCount(text) === 0) {
    questions.push({ text: QUESTIONS[TOPIC_QUESTION[projectType]][reply], suggestions: [] });
  }
  return { projectType, language, questions };
}
