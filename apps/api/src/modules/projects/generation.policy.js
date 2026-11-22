import { AppError } from '../../utils/AppError.js';
import { REQUIRED_FILES, validateProject } from '../validation/validateProject.js';

export { REQUIRED_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from '../validation/validateProject.js';

const bad = () =>
  new AppError(
    502,
    'AI_INVALID_RESPONSE',
    'The AI helper gave an unexpected answer. Please try again.',
  );

// Holds ANY provider's generated output to the project validator (Prompt 19) before anything is saved.
// Returns { files, validation } in a fixed order, or throws a generic 502 that never exposes the code.
// `error.issueCodes` lets callers log why, without logging content.
export function enforceGenerationPolicy(output) {
  const raw = output?.files ?? [];
  const validation = validateProject(raw);
  if (!validation.valid) {
    const err = bad();
    err.issueCodes = validation.errors.map((e) => e.code);
    throw err;
  }
  const byPath = new Map(raw.map((f) => [f.path, f]));
  const files = Object.keys(REQUIRED_FILES).map((n) => byPath.get(n));
  return { files, validation };
}
