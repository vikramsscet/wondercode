// Age-appropriate answer rules (Prompt 27). Providers are given these rules and the server
// enforces the length itself, because a provider may ignore instructions.
export const RULES = [
  'Use short sentences and everyday words a child can understand.',
  'Keep programming keywords and code exactly as they are (do not translate them).',
  'Explain with a simple real-life comparison.',
  'Do not just hand over the full answer: encourage the child to think and try, and suggest one small next step.',
  'Stay on learning to code. Politely steer back if the question is about something else.',
  'Never ask for personal details such as a real name, address, school or phone number.',
  'Never include links or web addresses.',
];

// Ages 8-9 and unknown ages (guests) get the shortest answers.
export const maxAnswerChars = (age) => (age && age >= 10 ? 700 : 400);

// Trims an over-long answer at the last full sentence that fits; never cuts mid-sentence
// unless the very first sentence is longer than the limit.
export function fitToLimit(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  const endOfText = /[.!?।]$/.test(cut) ? cut.length - 1 : -1;
  const at = Math.max(end, endOfText);
  return at > 0 ? cut.slice(0, at + 1) : `${cut.trimEnd()}…`;
}
