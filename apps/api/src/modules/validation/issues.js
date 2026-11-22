// Structured validation issues. `message` is written for a child; `code` is stable for programs.
export const CATEGORIES = ['path', 'type', 'size', 'syntax', 'capability', 'dependency'];

export const issue = (severity, category, code, file, message, loc = {}) => ({
  severity, // 'error' blocks saving; 'warning' is shown but allowed
  category,
  code,
  file,
  line: loc.line ?? null,
  column: loc.column ?? null,
  message,
});
export const error = (...args) => issue('error', ...args);
export const warning = (...args) => issue('warning', ...args);
