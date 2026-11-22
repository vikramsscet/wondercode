import { matchForm } from './prompts.text.js';

// Rule-based moderation (ADR 0014). A real moderation model can plug in later via the `extra` hook.
// Patterns are matched against whole words (or Devanagari phrases) in English, Hindi and Hinglish.
const w = (words) =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${words.join('|')})(?![\\p{L}\\p{N}])`, 'iu');

export const CATEGORIES = {
  violence: w([
    'kill(?:s|ing)?',
    'murder\\w*',
    'gun(?:s)?',
    'bomb(?:s)?',
    'weapon(?:s)?',
    'blood\\w*',
    'shoot(?:ing)?',
    'stab\\w*',
    'torture',
    'maar(?:na|o)?\\s*dal\\w*',
    'hatya',
    'bandook',
    'हत्या',
    'बंदूक',
    'बम',
    'मारना',
    'खून',
  ]),
  sexual: w([
    'sex\\w*',
    'porn\\w*',
    'nude',
    'naked',
    'nsfw',
    'erotic',
    'xxx',
    'nanga',
    'नंगा',
    'सेक्स',
  ]),
  self_harm: w([
    'suicide',
    'self[- ]?harm',
    'hurt myself',
    'kill myself',
    'end my life',
    'khudkushi',
    'आत्महत्या',
  ]),
  hate: w([
    'racist',
    'nazi',
    'terroris\\w*',
    'hate (?:speech|them|him|her)',
    'inferior race',
    'नफरत',
  ]),
  drugs: w(['drugs?', 'cocaine', 'heroin', 'weed', 'marijuana', 'meth', 'alcohol game', 'नशा']),
  personal_data: w([
    'password(?:s)?',
    'phone number',
    'home address',
    'credit card',
    'aadhaar',
    'aadhar',
    'otp',
    'collect (?:my )?(?:name|email|address)',
    'पासवर्ड',
  ]),
  malware: w([
    'hack(?:ing|er)?',
    'keylogger',
    'virus',
    'malware',
    'ransomware',
    'phishing',
    'steal\\w*',
    'ddos',
  ]),
  injection: w([
    'ignore (?:all |your |previous |the )*(?:instructions?|rules?)',
    'system prompt',
    'jailbreak',
    'developer mode',
    'you are now',
    'pretend (?:you have|there is) no (?:rules|limits)',
    'disregard (?:all |your |previous )*(?:instructions?|rules?)',
  ]),
};

// Calm, age-appropriate messages. They never repeat the child's words.
const MESSAGES = {
  en: {
    default:
      "I can't help with that one, but I'd love to help you build something fun! Try a game, quiz, calculator, animation or webpage.",
    self_harm:
      "It sounds like something might be bothering you. Please talk to a parent or a trusted grown-up. I'm here to build fun projects whenever you're ready.",
    personal_data:
      "Let's keep private things like passwords and phone numbers out of our projects. Want to build a game or quiz instead?",
    injection:
      'I follow my own safe rules, so I can\'t change them. Tell me what you want to build, like "a space quiz"!',
  },
  hi: {
    default:
      'इसमें मैं मदद नहीं कर सकता, लेकिन कुछ मज़ेदार बनाने में ज़रूर मदद करूँगा! गेम, क्विज़, कैलकुलेटर, एनिमेशन या वेबपेज आज़माओ।',
    self_harm:
      'लगता है कोई बात तुम्हें परेशान कर रही है। कृपया अपने माता-पिता या किसी भरोसेमंद बड़े से बात करो। जब तैयार हो, हम मज़ेदार प्रोजेक्ट बनाएँगे।',
    personal_data: 'पासवर्ड और फ़ोन नंबर जैसी निजी बातें हम प्रोजेक्ट में नहीं रखेंगे। क्या कोई गेम या क्विज़ बनाएँ?',
    injection: 'मैं अपने सुरक्षित नियमों पर चलता हूँ, इन्हें बदल नहीं सकता। बताओ क्या बनाना है, जैसे "स्पेस क्विज़"!',
  },
  hinglish: {
    default:
      'Isme main help nahi kar sakta, lekin kuch fun banane mein zaroor karunga! Game, quiz, calculator, animation ya webpage try karo.',
    self_harm:
      'Lagta hai kuch baat tumhe pareshaan kar rahi hai. Please apne parents ya kisi trusted bade se baat karo. Jab ready ho, hum fun projects banayenge.',
    personal_data:
      'Password aur phone number jaisi private baatein hum project mein nahi rakhenge. Koi game ya quiz banayein?',
    injection:
      'Main apne safe rules follow karta hoon, unhe badal nahi sakta. Batao kya banana hai, jaise "space quiz"!',
  },
};

// Returns { allowed: true } or { allowed: false, category, message }.
// `extra` is an optional async hook for a future moderation model: (text) => category | null.
export function moderate(text, language = 'en') {
  const forms = [text, matchForm(text)];
  for (const [category, pattern] of Object.entries(CATEGORIES)) {
    if (forms.some((f) => pattern.test(f))) return blocked(category, language);
  }
  return { allowed: true };
}

export async function moderateWithHook(text, language, extra) {
  const base = moderate(text, language);
  if (!base.allowed || !extra) return base;
  const category = await extra(text);
  return category ? blocked(category, language) : base;
}

function blocked(category, language) {
  const set = MESSAGES[language] ?? MESSAGES.en;
  return { allowed: false, category, message: set[category] ?? set.default };
}
