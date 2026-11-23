import { createHash } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import * as explanationsRepo from '../explanations/explanations.repository.js';
import * as projects from '../projects/projects.repository.js';
import * as storage from '../projects/projects.storage.js';

export const MAX_CONTEXT_LINES = 40;
export const MAX_CONTEXT_CHARS = 2000;
const sha256 = (t) => createHash('sha256').update(t, 'utf8').digest('hex');
const notFound = (what) => new AppError(404, 'NOT_FOUND', `${what} not found.`);

// Decides exactly what the teacher may see: the caller's own project (title, type, concepts) and,
// if the child selected lines, those SAVED lines of that file (hash-checked), plus the concept of
// a saved explanation for the same lines. Nothing else: no other files, projects or children.
export async function buildContext(
  { supabase },
  owner,
  { projectId, versionId, selection, explanationLanguage },
) {
  const project = await projects.findOwnedProject(supabase, owner, projectId);
  if (!project?.current_version_id) throw notFound('Project');
  const version = await projects.findVersion(supabase, versionId ?? project.current_version_id);
  if (!version || version.project_id !== project.id) throw notFound('Version');

  const context = {
    projectTitle: project.title,
    projectType: project.project_type,
    ...(Array.isArray(version.project_plan?.learningConcepts) && {
      learningConcepts: version.project_plan.learningConcepts.slice(0, 10),
    }),
  };

  if (selection) {
    const row = (await projects.listFiles(supabase, version.id)).find(
      (f) => f.file_path === selection.filePath,
    );
    if (!row) throw notFound('File');
    const content = await storage.downloadFile(supabase, row.storage_key);
    if (sha256(content) !== row.content_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'We could not open this project.');
    }
    const lines = content.split('\n');
    const lineStart = Math.min(selection.lineStart, lines.length);
    const lineEnd = Math.min(selection.lineEnd, lines.length, lineStart + MAX_CONTEXT_LINES - 1);
    const snippet = lines.slice(lineStart - 1, lineEnd).join('\n');
    Object.assign(context, {
      filePath: selection.filePath,
      lineStart,
      lineEnd,
      code: snippet.slice(0, MAX_CONTEXT_CHARS),
    });
    const explanation = await explanationsRepo.findExplanation(supabase, {
      versionId: version.id,
      filePath: selection.filePath,
      lineStart,
      lineEnd,
      codeHash: sha256(snippet),
      language: explanationLanguage,
    });
    if (explanation?.explanation_payload?.concept) {
      context.concept = explanation.explanation_payload.concept;
    }
  }
  return { project, version, context };
}
