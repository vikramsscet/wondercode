// Unsaved edits are kept in this browser only, so a reload or an accidental close does not lose
// them. Drafts hold code only (never prompts), are keyed by child/guest + project + version,
// are size-capped, expire, and are validated before use. Storage may be blocked: never throw.
export const DRAFT_MAX_CHARS = 400 * 1024; // same as the project size limit
export const DRAFT_FILE_MAX_CHARS = 200 * 1024;
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const draftKey = (ownerId, projectId, versionId) =>
  `wondercode.draft.${ownerId}.${projectId}.${versionId}`;

export function saveDraft(key, edits, now = Date.now()) {
  try {
    const paths = Object.keys(edits);
    if (paths.length === 0) return window.localStorage.removeItem(key);
    const total = paths.reduce((n, p) => n + edits[p].length, 0);
    if (total > DRAFT_MAX_CHARS) return undefined; // too big to keep; leave any older draft alone
    return window.localStorage.setItem(key, JSON.stringify({ savedAt: now, edits }));
  } catch {
    return undefined;
  }
}

export function clearDraft(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// Returns { path: text } for files that exist and really differ from the saved version, or null.
export function loadDraft(key, files, now = Date.now()) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.savedAt !== 'number' || now - draft.savedAt > DRAFT_TTL_MS) {
      clearDraft(key);
      return null;
    }
    const original = new Map(files.map((f) => [f.path, f.content]));
    const edits = {};
    let total = 0;
    for (const [path, text] of Object.entries(draft.edits ?? {})) {
      if (!original.has(path) || typeof text !== 'string') continue;
      if (text.length > DRAFT_FILE_MAX_CHARS || text === original.get(path)) continue;
      total += text.length;
      edits[path] = text;
    }
    if (total > DRAFT_MAX_CHARS || Object.keys(edits).length === 0) {
      clearDraft(key);
      return null;
    }
    return edits;
  } catch {
    return null;
  }
}
