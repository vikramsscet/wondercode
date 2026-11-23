import { createHash, randomUUID } from 'node:crypto';
import { AppError } from '../../utils/AppError.js';
import { countUsageSince } from '../ai/usage.repository.js';
import { isUnsafeText, strings } from '../explanations/explanations.policy.js';
import { moderateWithHook } from '../prompts/prompts.moderation.js';
import { cleanPrompt, hasLetters, PROMPT_MAX, PROMPT_MIN } from '../prompts/prompts.text.js';
import { insertUsageEvent } from '../ai/usage.repository.js';
import { enforceGenerationPolicy } from './generation.policy.js';
import * as repo from './projects.repository.js';
import { present } from './projects.service.js';
import * as storage from './projects.storage.js';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const DAY_MS = 24 * 60 * 60 * 1000;
const ATTEMPTS = 2; // one automatic retry when the AI's files fail validation

const TOO_SHORT = {
  en: 'Tell me a little more about what you want to change.',
  hi: 'थोड़ा और बताओ कि तुम क्या बदलना चाहते हो।',
  hinglish: 'Thoda aur batao ki tum kya badalna chahte ho.',
};
const NO_CHANGE = {
  en: "I didn't change anything this time. Try saying it in a different way.",
  hi: 'इस बार मैंने कुछ नहीं बदला। इसे किसी और तरह से कहकर देखो।',
  hinglish: 'Is baar maine kuch nahi badla. Ise kisi aur tarah se kehkar dekho.',
};
const GENERIC_SUMMARY = {
  en: 'Updated this file.',
  hi: 'इस फ़ाइल को बदल दिया।',
  hinglish: 'Is file ko badal diya.',
};
const outdated = () =>
  new AppError(409, 'VERSION_OUTDATED', 'This project has a newer version. Open it again first.');

async function recordBlocked(supabase, logger, owner, category) {
  if (!supabase) return;
  try {
    await insertUsageEvent(supabase, {
      child_profile_id: owner.childProfileId ?? null,
      guest_session_id: owner.guestSessionId ?? null,
      event_type: 'experiment.blocked',
      units: 1,
      metadata: { category },
    });
  } catch (err) {
    logger.warn?.({ err }, 'could not record experiment event');
  }
}

// The saved files of a version, hash-checked, as { path, language, content }.
export async function loadVersionFiles(supabase, versionId) {
  const rows = await repo.listFiles(supabase, versionId);
  const files = [];
  for (const row of rows) {
    const content = await storage.downloadFile(supabase, row.storage_key);
    if (sha256(content) !== row.content_hash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'We could not open this project.');
    }
    files.push({ path: row.file_path, language: row.language, content });
  }
  return files;
}

// Asks the AI for the changed project and holds it to the same rules as generation: the whole
// set of files must validate, and the summaries must be safe text. One retry, then a generic 502.
async function refineValid({ ai, logger = console }, owner, files, instruction, language) {
  let last;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const { data, meta } = await ai.refineProject(owner, { files, instruction, language });
    try {
      if (strings(data.changes).some(isUnsafeText)) {
        throw new AppError(
          502,
          'AI_INVALID_RESPONSE',
          'The AI helper gave an unexpected answer. Please try again.',
        );
      }
      return { ...enforceGenerationPolicy({ files: data.files }), changes: data.changes, meta };
    } catch (err) {
      if (err.code !== 'AI_INVALID_RESPONSE') throw err;
      last = err;
      logger.warn?.({ attempt, issues: err.issueCodes }, 'changed project failed validation');
    }
  }
  throw last;
}

// Experiment Mode: a natural-language change creates a NEW version. Earlier versions are never
// touched. The instruction is untrusted text: cleaned, moderated, never echoed or logged.
export async function runExperiment(ctx, owner, projectId, body) {
  const { supabase, config, logger = console, moderationHook, now = () => new Date() } = ctx;
  const { baseVersionId, language } = body;

  const text = cleanPrompt(body.instruction);
  if (text.length < PROMPT_MIN || !hasLetters(text) || text.length > PROMPT_MAX) {
    return { status: 'invalid', message: TOO_SHORT[language] };
  }
  const verdict = await moderateWithHook(text, language, moderationHook);
  if (!verdict.allowed) {
    await recordBlocked(supabase, logger, owner, verdict.category);
    return { status: 'blocked', message: verdict.message };
  }

  const project = await repo.findOwnedProject(supabase, owner, projectId);
  if (!project?.current_version_id) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  if (baseVersionId !== project.current_version_id) throw outdated();
  const base = await repo.findVersion(supabase, baseVersionId);
  if (!base || base.project_id !== project.id) throw outdated();

  const numbers = await repo.listVersionNumbers(supabase, project.id);
  if (numbers.length >= config.experiments.maxVersions) {
    throw new AppError(
      409,
      'PROJECT_VERSION_LIMIT',
      'This project has lots of versions! Start a new project to keep going.',
    );
  }
  const limit = owner.guestSessionId
    ? config.experiments.dailyLimitGuest
    : config.experiments.dailyLimitChild;
  const since = new Date(now().getTime() - DAY_MS).toISOString();
  if ((await countUsageSince(supabase, owner, 'ai.refine_project', since)) >= limit) {
    throw new AppError(
      429,
      'EXPERIMENT_LIMIT_REACHED',
      "You've tried lots of changes today! Come back tomorrow for more.",
    );
  }

  const baseFiles = await loadVersionFiles(supabase, base.id);
  const { files, validation, changes, meta } = await refineValid(
    ctx,
    owner,
    baseFiles,
    text,
    language,
  );

  // What really changed comes from comparing content, not from what the AI claims.
  const before = new Map(baseFiles.map((f) => [f.path, sha256(f.content)]));
  const changed = files.filter((f) => before.get(f.path) !== sha256(f.content));
  if (changed.length === 0) return { status: 'no_change', message: NO_CHANGE[language] };
  const summaryOf = new Map(changes.map((c) => [c.path, c.summary]));
  const changedFiles = changed.map((f) => ({
    path: f.path,
    summary: summaryOf.get(f.path) ?? GENERIC_SUMMARY,
  }));

  // Save as a new version: files, version row, manifest, then switch current (compare-and-set).
  const versionNumber = Math.max(...numbers) + 1;
  const ownerPart = owner.childProfileId
    ? `child/${owner.childProfileId}`
    : `guest/${owner.guestSessionId}`;
  const keyFor = (f) => `${ownerPart}/${project.id}/v${versionNumber}/${f.path}`;
  const uploaded = [];
  let versionId = null;
  try {
    for (const f of files) {
      await storage.uploadFile(supabase, keyFor(f), f);
      uploaded.push(keyFor(f));
    }
    const version = await repo.insertVersion(supabase, {
      id: randomUUID(),
      project_id: project.id,
      version_number: versionNumber,
      origin: 'refined',
      prompt: text,
      project_plan: base.project_plan ?? null,
      language_set: base.language_set ?? ['html', 'css', 'javascript'],
    });
    versionId = version.id;
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
    const moved = await repo.setCurrentVersionIf(supabase, project.id, base.id, version.id);
    if (moved.length === 0) throw outdated(); // another change got there first
    return {
      status: 'ok',
      ...present(
        project,
        version,
        files.map((f) => ({ ...f, sizeBytes: Buffer.byteLength(f.content, 'utf8') })),
        validation,
        { isMock: meta.isMock, previousVersionId: base.id, changedFiles },
      ),
    };
  } catch (err) {
    try {
      if (versionId) await repo.deleteVersion(supabase, versionId);
      await storage.removeFiles(supabase, uploaded);
    } catch (cleanupErr) {
      logger.error?.(
        { err: cleanupErr, projectId },
        'could not fully clean up a failed experiment',
      );
    }
    if (err instanceof AppError) throw err;
    if (err?.code === '23505') throw outdated(); // another version took this number
    logger.error?.({ err }, 'could not save experiment');
    throw new AppError(500, 'INTERNAL_ERROR', 'We could not save your change. Please try again.');
  }
}
