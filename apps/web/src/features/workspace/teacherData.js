export const QUESTION_MAX = 500;

// Starter questions in each explanation language.
export const SUGGESTED = {
  en: ['What does this code do?', 'Why do we use a variable?', 'What can I try next?'],
  hi: ['यह कोड क्या करता है?', 'हम वेरिएबल क्यों इस्तेमाल करते हैं?', 'अब मैं क्या आज़मा सकता हूँ?'],
  hinglish: [
    'Ye code kya karta hai?',
    'Hum variable kyun use karte hain?',
    'Ab main kya try kar sakta hoon?',
  ],
};

// Splits text into plain and `code` parts. Everything is rendered as text, never as HTML.
export function parseParts(text) {
  return String(text)
    .split(/(`[^`\n]+`)/g)
    .filter(Boolean)
    .map((part) =>
      part.length > 2 && part.startsWith('`') && part.endsWith('`')
        ? { code: true, text: part.slice(1, -1) }
        : { code: false, text: part },
    );
}
