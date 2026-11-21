// TEMPORARY sample data. Replace with real APIs:
//   projects  -> project library (Prompt 32)
//   journey   -> My Coding Journey (Prompt 35)
//   challenges-> learning paths and challenges (Prompt 34)
//   ideas     -> Prompt Studio (Prompt 17)
// The dashboard labels all of this as a preview so it is never mistaken for real progress.

export const starterIdeas = [
  { id: 'game', icon: '🎮', title: 'A catching game', text: 'A cat that catches falling stars.' },
  { id: 'quiz', icon: '❓', title: 'A fun quiz', text: 'Quiz your friends about animals.' },
  { id: 'calculator', icon: '🧮', title: 'A calculator', text: 'Add, subtract and more.' },
  {
    id: 'animation',
    icon: '✨',
    title: 'An animation',
    text: 'Make shapes dance and change colour.',
  },
];

export const journeyStages = [
  { id: 'seedling', icon: '🌱', title: 'Seedling', text: 'My first webpage' },
  { id: 'creator', icon: '🎨', title: 'Creator', text: 'My first interactive site' },
  { id: 'explorer', icon: '🧭', title: 'Explorer', text: 'Buttons, events and variables' },
  { id: 'game-builder', icon: '🕹️', title: 'Game Builder', text: 'My first browser game' },
  { id: 'young-developer', icon: '🚀', title: 'Young Developer', text: 'A complete mini-project' },
];

export const sampleChallenges = [
  { id: 'add-a-button', title: 'Add a button', language: 'HTML', level: 1 },
  { id: 'change-the-background', title: 'Change the background', language: 'CSS', level: 1 },
  { id: 'count-the-clicks', title: 'Count the clicks', language: 'JavaScript', level: 2 },
];
