import { createHash } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import * as projects from '../projects/projects.repository.js';
import * as storage from '../projects/projects.storage.js';
import { MAX_EXPLAIN_LINES } from './explanations.schemas.js';
import { enforceExplanationPolicy } from './explanations.policy.js';
import * as repo from './explanations.repository.js';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const notFound = (what = 'Project') => new AppError(404, 'NOT_FOUND', `${what} not found.`);

// Loads a SAVED file of a version the caller owns. The stored hash is checked, so tampered
// storage is never explained.
async function loadSavedFile(supabase, owner, projectId, versionId, filePath) {
  const project = await projects.findOwnedProject(supabase, owner, projectId);
  if (!project) throw notFound();
  const version = await projects.findVersion(supabase, versionId);
  if (!version || version.project_id !== project.id) throw notFound('Version');
  const row = (await projects.listFiles(supabase, version.id)).find(
    (f) => f.file_path === filePath,
  );
  if (!row) throw notFound('File');
  const content = await storage.downloadFile(supabase, row.storage_key);
  if (sha256(content) !== row.content_hash) {
    throw new AppError(500, 'INTERNAL_ERROR', 'We could not open this project.');
  }
  return { project, version, content };
}

const present = (row, currentVersionId) => ({
  id: row.id,
  versionId: row.version_id,
  filePath: row.file_path,
  lineStart: row.line_start,
  lineEnd: row.line_end,
  codeHash: row.code_hash,
  explanationLanguage: row.explanation_language,
  ...row.explanation_payload,
  // An explanation belongs to one version; once the project moves on it is stale.
  stale: row.version_id !== currentVersionId,
});

// Explains selected lines of a saved version. The request carries the hash the browser saw;
// the server recomputes it from the saved source and refuses to explain anything that differs.
export async function explainLines(ctx, owner, projectId, body) {
  const { supabase, ai, logger = console } = ctx;
  const { versionId, filePath, lineStart, lineEnd, codeHash, explanationLanguage } = body;
  const { project, content } = await loadSavedFile(supabase, owner, projectId, versionId, filePath);

  const lines = content.split('\n');
  if (lineEnd > lines.length || lineEnd - lineStart + 1 > MAX_EXPLAIN_LINES) {
    throw new AppError(422, 'EXPLANATION_RANGE_INVALID', 'Pick a smaller group of lines.');
  }
  const snippet = lines.slice(lineStart - 1, lineEnd).join('\n');
  if (!snippet.trim()) {
    throw new AppError(422, 'EXPLANATION_RANGE_INVALID', 'Pick some lines that have code in them.');
  }
  const serverHash = sha256(snippet);
  if (serverHash !== codeHash) {
    throw new AppError(
      409,
      'EXPLANATION_STALE',
      'This code has changed. Select the lines again to get a fresh explanation.',
    );
  }

  const key = {
    versionId,
    filePath,
    lineStart,
    lineEnd,
    codeHash: serverHash,
    language: explanationLanguage,
  };
  const cached = await repo.findExplanation(supabase, key);
  if (cached) return { ...present(cached, project.current_version_id), cached: true };

  const { data, meta } = await ai.explainCode(owner, {
    filePath,
    code: content,
    lineStart,
    lineEnd,
    explanationLanguage,
  });
  const payload = { ...enforceExplanationPolicy(data), isMock: meta.isMock };

  // The binding comes from the server's own checks, never from the provider's output.
  const row = {
    child_profile_id: owner.childProfileId ?? null,
    guest_session_id: owner.guestSessionId ?? null,
    version_id: versionId,
    file_path: filePath,
    line_start: lineStart,
    line_end: lineEnd,
    code_hash: serverHash,
    explanation_language: explanationLanguage,
    explanation_payload: payload,
  };
  try {
    const saved = await repo.insertExplanation(supabase, row);
    return { ...present(saved, project.current_version_id), cached: false };
  } catch (err) {
    // A parallel request may have saved the same explanation first.
    const again = await repo.findExplanation(supabase, key).catch(() => null);
    if (again) return { ...present(again, project.current_version_id), cached: true };
    logger.error?.({ err }, 'could not save explanation');
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      'We could not save the explanation. Please try again.',
    );
  }
}

// Saved explanations of a version (default: the current one), each marked stale or not.
export async function listForProject({ supabase }, owner, projectId, versionId) {
  const project = await projects.findOwnedProject(supabase, owner, projectId);
  if (!project?.current_version_id) throw notFound();
  const id = versionId ?? project.current_version_id;
  const version = await projects.findVersion(supabase, id);
  if (!version || version.project_id !== project.id) throw notFound('Version');
  const rows = await repo.listExplanations(supabase, id);
  return rows.map((r) => present(r, project.current_version_id));
}
