import { error } from './issues.js';
import { validateCss } from './css.js';
import { validateHtml } from './html.js';
import { validateScript } from './script.js';

// The MVP project is exactly these three flat files.
export const REQUIRED_FILES = {
  'index.html': 'html',
  'style.css': 'css',
  'script.js': 'javascript',
};
export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_TOTAL_BYTES = 400 * 1024;

const CHECKERS = { html: validateHtml, css: validateCss, javascript: validateScript };
const PATH_OK = /^[A-Za-z0-9._-]{1,64}$/;

// Validates a project's files and returns a structured result. Pure: it parses text and never runs it.
//   { valid, errors[], warnings[], summary: { files, errors, warnings, checked: [...] } }
// `valid` means "parsed and statically checked with no errors". It does NOT mean the code has run.
export function validateProject(files) {
  const issues = [];
  const list = Array.isArray(files) ? files : [];
  const names = Object.keys(REQUIRED_FILES);
  const seen = new Set();
  let total = 0;
  const checked = [];

  for (const f of list) {
    const path = typeof f?.path === 'string' ? f.path : '(unnamed)';
    if (!PATH_OK.test(path)) {
      issues.push(
        error(
          'path',
          'path-invalid',
          path,
          'File names can only use letters, numbers, dots, dashes and underscores.',
        ),
      );
      continue;
    }
    if (seen.has(path)) {
      issues.push(error('path', 'path-duplicate', path, `There are two files called ${path}.`));
      continue;
    }
    seen.add(path);
    if (!(path in REQUIRED_FILES)) {
      issues.push(
        error(
          'path',
          'path-unexpected',
          path,
          `${path} is not part of a WonderCode project. Use index.html, style.css and script.js.`,
        ),
      );
      continue;
    }
    if (f.language !== REQUIRED_FILES[path] || typeof f.content !== 'string') {
      issues.push(
        error('type', 'type-mismatch', path, `${path} should be a ${REQUIRED_FILES[path]} file.`),
      );
      continue;
    }
    const size = Buffer.byteLength(f.content, 'utf8');
    total += size;
    if (size === 0) {
      issues.push(error('size', 'size-empty', path, `${path} is empty.`));
    } else if (size > MAX_FILE_BYTES) {
      issues.push(
        error(
          'size',
          'size-file',
          path,
          `${path} is too big (the limit is ${MAX_FILE_BYTES / 1024} KB).`,
        ),
      );
    } else {
      issues.push(...CHECKERS[f.language](path, f.content));
      checked.push(path);
    }
  }
  for (const n of names) {
    if (!seen.has(n)) issues.push(error('path', 'path-missing', n, `${n} is missing.`));
  }
  if (total > MAX_TOTAL_BYTES) {
    issues.push(
      error(
        'size',
        'size-total',
        '(project)',
        `The project is too big (the limit is ${MAX_TOTAL_BYTES / 1024} KB).`,
      ),
    );
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: { files: list.length, errors: errors.length, warnings: warnings.length, checked },
  };
}
