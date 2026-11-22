import { AppError } from '../../utils/AppError.js';

// Restrictions on generated code, applied to ANY provider's output before anything is saved (Prompt 18).
// Basic file / path / size / dependency rules only. Deep validation (syntax, capabilities) is Prompt 19.
export const REQUIRED_FILES = {
  'index.html': 'html',
  'style.css': 'css',
  'script.js': 'javascript',
};
export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_TOTAL_BYTES = 400 * 1024;

const EXTERNAL = /(?:https?:|ftp:|wss?:|\/\/[a-z0-9])/i;
const bad = () =>
  new AppError(
    502,
    'AI_INVALID_RESPONSE',
    'The AI helper gave an unexpected answer. Please try again.',
  );

const ATTR_URL =
  /\b(?:src|href|action|data|poster|srcset|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const FORBIDDEN_TAGS = /<\s*(?:iframe|frame|frameset|object|embed|base|applet|form)\b/i;
const META_REFRESH = /<\s*meta[^>]+http-equiv\s*=\s*["']?refresh/i;
const SCRIPT_TAG = /<\s*script\b([^>]*)>/gi;

function checkHtml(html) {
  if (FORBIDDEN_TAGS.test(html) || META_REFRESH.test(html)) return false;
  // Only <script src="script.js"> is allowed (no inline or third-party scripts).
  for (const m of html.matchAll(SCRIPT_TAG)) {
    if (!/^\s*src\s*=\s*["']?script\.js["']?\s*$/i.test(m[1])) return false;
  }
  // Every URL-bearing attribute must point at our own two files or an in-page anchor.
  for (const m of html.matchAll(ATTR_URL)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
    if (!['style.css', 'script.js'].includes(value) && !/^#[\w-]*$/.test(value)) return false;
  }
  return true;
}

const checkCss = (css) =>
  !/@import/i.test(css) && !EXTERNAL.test(css) && !/url\s*\(\s*["']?(?!#)/i.test(css);

const NETWORK_OR_MODULES =
  /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts|require)\s*\(|\bimport\s*(?:\(|[\w{*"'])|navigator\s*\.\s*sendBeacon|new\s+(?:Worker|SharedWorker)\b/;
const checkJs = (js) => !NETWORK_OR_MODULES.test(js) && !EXTERNAL.test(js);

// Returns the validated files [{ path, language, content }] in a fixed order, or throws a generic 502.
export function enforceGenerationPolicy(output) {
  const files = output?.files ?? [];
  const byPath = new Map(files.map((f) => [f.path, f]));
  const names = Object.keys(REQUIRED_FILES);
  if (files.length !== names.length || byPath.size !== files.length) throw bad();
  if (!names.every((n) => byPath.has(n))) throw bad();

  let total = 0;
  for (const name of names) {
    const file = byPath.get(name);
    if (file.language !== REQUIRED_FILES[name]) throw bad();
    const size = Buffer.byteLength(file.content, 'utf8');
    total += size;
    if (size === 0 || size > MAX_FILE_BYTES) throw bad();
  }
  if (total > MAX_TOTAL_BYTES) throw bad();

  const ok =
    checkHtml(byPath.get('index.html').content) &&
    checkCss(byPath.get('style.css').content) &&
    checkJs(byPath.get('script.js').content);
  if (!ok) throw bad();

  return names.map((n) => byPath.get(n));
}
