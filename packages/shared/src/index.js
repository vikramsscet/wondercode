// Constants used by both the API (validation) and the web app (UI). Keep this package tiny.

export const AGE_MIN = 8;
export const AGE_MAX = 12;
export const MAX_CHILDREN_PER_PARENT = 5;
export const MAX_INTERESTS = 5;

export const EXPLANATION_LANGUAGES = ['en', 'hi', 'hinglish'];

// Built-in avatars. The web app ships the artwork; only the key is stored.
export const AVATAR_KEYS = [
  'fox',
  'panda',
  'robot',
  'owl',
  'cat',
  'dino',
  'rocket',
  'unicorn',
  'penguin',
  'octopus',
  'tiger',
  'frog',
];

// Fixed interest tags (no free text about children).
export const INTEREST_TAGS = [
  'games',
  'animals',
  'space',
  'music',
  'art',
  'sports',
  'stories',
  'science',
  'food',
  'quizzes',
];
