import { AVATAR_KEYS } from '@wondercode/shared';

// Built-in avatars. Only the key is stored in the database; the artwork lives here in the frontend.
// Emoji on coloured circles are placeholders until illustrated avatars are added.
const ART = {
  fox: ['🦊', 'Fox'],
  panda: ['🐼', 'Panda'],
  robot: ['🤖', 'Robot'],
  owl: ['🦉', 'Owl'],
  cat: ['🐱', 'Cat'],
  dino: ['🦖', 'Dino'],
  rocket: ['🚀', 'Rocket'],
  unicorn: ['🦄', 'Unicorn'],
  penguin: ['🐧', 'Penguin'],
  octopus: ['🐙', 'Octopus'],
  tiger: ['🐯', 'Tiger'],
  frog: ['🐸', 'Frog'],
};
const BACKGROUNDS = ['bg-brand-100', 'bg-sun-100', 'bg-mint-100', 'bg-coral-100'];

export const avatars = AVATAR_KEYS.map((key, index) => ({
  key,
  emoji: ART[key]?.[0] ?? '⭐',
  label: ART[key]?.[1] ?? key,
  background: BACKGROUNDS[index % BACKGROUNDS.length],
}));

export const getAvatar = (key) => avatars.find((a) => a.key === key) ?? avatars[0];
