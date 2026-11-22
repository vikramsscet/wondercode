// Sanitising and normalising child prompts. Prompts are untrusted data, never instructions.
export const PROMPT_MIN = 3;
export const PROMPT_MAX = 500;

// Control, zero-width and line/paragraph separator characters (written as escapes on purpose).
/* eslint-disable no-control-regex */
const CONTROL_CHARS = new RegExp(
  '[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202f\\u2060\\ufeff]',
  'g',
);
/* eslint-enable no-control-regex */

// Removes control/zero-width characters, collapses whitespace, lowercases for matching.
export function cleanPrompt(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(CONTROL_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Letters from any script; a prompt of only digits/symbols is not a real idea.
export const hasLetters = (text) => /\p{L}/u.test(text);

// Matching form: lowercase, leetspeak/punctuation between letters removed ("k.i.l.l" -> "kill").
export function matchForm(text) {
  return text
    .toLowerCase()
    .replace(/(?<=\p{L})[.\-_*'](?=\p{L})/gu, '')
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's');
}
