import { AppError } from '../../utils/AppError.js';
import { moderate } from '../prompts/prompts.moderation.js';

const URL_LIKE = /(?:https?:|ftp:|www\.|\/\/[a-z0-9])/i;
const HTML_LIKE = /<\/?[a-z!][^>]*>/i;

function strings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

// Applied to ANY provider's explanation: no links, no HTML, nothing the moderation rules block.
// Throws a generic error; what the model wrote never reaches the child or the logs.
export function enforceExplanationPolicy(output) {
  const { concept, explanation, realLifeExample, tryThis } = output;
  const text = strings({ concept, explanation, realLifeExample, tryThis });
  if (text.some((t) => URL_LIKE.test(t) || HTML_LIKE.test(t) || !moderate(t).allowed)) {
    throw new AppError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI helper gave an unexpected answer. Please try again.',
    );
  }
  return { concept, explanation, realLifeExample, tryThis };
}
