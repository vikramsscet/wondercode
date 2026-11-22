import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import { assertGuestProjectQuota } from '../guests/guests.service.js';
import { moderate } from '../prompts/prompts.moderation.js';
import { cleanPrompt } from '../prompts/prompts.text.js';
import { enforcePlanPolicy } from '../prompts/plans.service.js';
import { enforceGenerationPolicy } from './generation.policy.js';
import { validateProject } from '../validation/validateProject.js';
import * as repo from './projects.repository.js';
import * as storage from './projects.storage.js';

export const MAX_PROJECTS_PER_CHILD = 50;
const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

const notFound = () => new AppError(404, 'NOT_FOUND', 'Project not found.');

const GENERATION_ATTEMPTS = 2; // one automatic retry when the AI's code fails validation

// Calls the AI and validates its code; retries once if the code does not pass.
async function generateValidCode({ ai, logger = console }, owner, plan, language) {
  let last;
  for (let attempt = 1; attempt <= GENERATION_ATTEMPTS; attempt += 1) {
    const { data, meta } = await ai.generateProjectCode(owner, { plan, language });
    try {
      return { ...enforceGenerationPolicy(data), data, meta };
    } catch (err) {
      if (err.code !== 'AI_INVALID_RESPONSE') throw err;
      last = err;
      logger.warn?.({ attempt, issues: err.issueCodes }, 'generated code failed validation');
    }
  }
  throw last;
}

const present = (project, version, files, validation, extra = {}) => ({
  project: {
    id: project.id,
    title: project.title,
    description: project.description,
    projectType: project.project_type,
    createdAt: project.created_at,
  },
  version: { id: version.id, versionNumber: version.version_number, origin: version.origin },
  files,
  // "validated" = parsed and statically checked with no errors. The code has NOT been run.
  validated: validation.valid,
  validation,
  ...extra,
});

async function assertQuota({ supabase, config }, owner) {
  if (owner.guestSessionId) return assertGuestProjectQuota(supabase, config, owner.guestSessionId);
  if ((await repo.countChildProjects(supabase, owner.childProfileId)) >= MAX_PROJECTS_PER_CHILD) {
    throw new AppError(
      409,
      'PROJECT_LIMIT_REACHED',
      'You have lots of projects! Finish one first.',
    );
  }
  return undefined;
}

// Generates code from an approved plan and saves it as version 1 of a new project.
export async function generateProject(ctx, owner, { plan, prompt = '', language }) {
  const { supabase, logger = console } = ctx;
  const text = cleanPrompt(prompt);
  if (text && !moderate(text).allowed) {
    throw new AppError(
      422,
      'PROMPT_NOT_ALLOWED',
      'This idea cannot be built. Try a different one.',
    );
  }
  enforcePlanPolicy(plan); // the plan came from the browser; never trust it
  await assertQuota(ctx, owner);

  const { files, validation, data, meta } = await generateValidCode(
    ctx,
    owner,
    plan,
    language ?? 'en',
  );

  const projectId = randomUUID();
  const ownerPart = owner.childProfileId
    ? `child/${owner.childProfileId}`
    : `guest/${owner.guestSessionId}`;
  const keyFor = (f) => `${ownerPart}/${projectId}/v1/${f.path}`;
  const uploaded = [];
  let projectCreated = false;
  try {
    for (const f of files) {
      await storage.uploadFile(supabase, keyFor(f), f);
      uploaded.push(keyFor(f));
    }
    const project = await repo.insertProject(supabase, {
      id: projectId,
      child_profile_id: owner.childProfileId ?? null,
      guest_session_id: owner.guestSessionId ?? null,
      title: plan.title,
      description: plan.description,
      project_type: plan.projectType,
    });
    projectCreated = true;
    const version = await repo.insertVersion(supabase, {
      project_id: projectId,
      version_number: 1,
      origin: 'generated',
      prompt: text,
      project_plan: plan,
      language_set: ['html', 'css', 'javascript'],
    });
    await repo.insertFiles(
      supabase,
      files.map((f) => ({
        version_id: version.id,
        file_path: f.path,
        language: f.language,
        storage_key: keyFor(f),
        content_hash: sha256(f.content),
        size_bytes: Buffer.byteLength(f.content, 'utf8'),
      })),
    );
    await repo.setCurrentVersion(supabase, projectId, version.id);
    return present(
      project,
      version,
      files.map((f) => ({ ...f, sizeBytes: Buffer.byteLength(f.content, 'utf8') })),
      validation,
      { isMock: meta.isMock, learningConcepts: data.learningConcepts },
    );
  } catch (err) {
    // Best effort: the JS client has no multi-table transaction (ADR 0017).
    try {
      if (projectCreated) await repo.deleteProject(supabase, projectId);
      await storage.removeFiles(supabase, uploaded);
    } catch (cleanupErr) {
      logger.error?.({ err: cleanupErr, projectId }, 'could not fully clean up a failed save');
    }
    logger.error?.({ err }, 'could not save generated project');
    throw new AppError(500, 'INTERNAL_ERROR', 'We could not save your project. Please try again.');
  }
}

// Returns the project's current version with file contents. Hash-checked against the saved manifest.
export async function getProject({ supabase }, owner, projectId) {
  const project = await repo.findOwnedProject(supabase, owner, projectId);
  if (!project?.current_version_id) throw notFound();
  const version = await repo.findVersion(supabase, project.current_version_id);
  const rows = await repo.listFiles(supabase, version.id);
  const files = [];
  for (const row of rows) {
    const content = await storage.downloadFile(supabase, row.storage_key);
    if (sha256(content) !== row.content_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'We could not open this project.');
    }
    files.push({
      path: row.file_path,
      language: row.language,
      content,
      sizeBytes: row.size_bytes,
    });
  }
  return present(project, version, files, validateProject(files));
}

// Validates files without saving them (for edits and refinements). Same rules as generation.
export const validateFiles = (files) => validateProject(files);
