// Static content for Prompt Studio. Starter cards and examples only fill the prompt box.
export const PROMPT_MAX = 500;

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'hinglish', label: 'Hinglish' },
];

export const starterCards = [
  { id: 'game', icon: '🎮', title: 'Game', prompt: 'Make a game where I catch falling stars' },
  { id: 'quiz', icon: '❓', title: 'Quiz', prompt: 'Make a quiz about animals' },
  {
    id: 'calculator',
    icon: '🧮',
    title: 'Calculator',
    prompt: 'Make a calculator that adds numbers',
  },
  {
    id: 'animation',
    icon: '✨',
    title: 'Animation',
    prompt: 'Make an animation of a bouncing ball',
  },
  { id: 'webpage', icon: '🌐', title: 'Webpage', prompt: 'Make a webpage all about me' },
];

export const examplePrompts = [
  'Make a space quiz with planets',
  'एक क्विज़ बनाओ जानवरों के बारे में',
  'Mujhe ek snake game banao',
  'A webpage about my favourite food',
];

export const MAX_ANSWERS = 2;
