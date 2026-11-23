import { AppError } from '../../utils/AppError.js';
import { countUsageSince, insertUsageEvent } from '../ai/usage.repository.js';
import { isUnsafeText, strings } from '../explanations/explanations.policy.js';
import { moderate, moderateWithHook } from '../prompts/prompts.moderation.js';
import { cleanPrompt } from '../prompts/prompts.text.js';
import { RULES } from '../teacher/teacher.rules.js';
import { validateProject } from '../validation/validateProject.js';
import { loadVersionFiles } from './experiments.service.js';
import * as repo from './projects.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MESSAGE_MAX = 300;
const CONTEXT_RADIUS = 5; // lines above and below the reported line
const MAX_CONTEXT_CHARS = 2000;
const MAX_FIX_LINES = 10;
const MAX_FIX_DISTANCE = 10; // a fix must be near the reported line

// Applies a one-spot fix to a COPY of the saved project and keeps it only if the whole project
// still passes the validator. The "before" text always comes from the saved file, never the AI.
function checkFix(files, fix, reportedLine, contextPath) {
  if (!fix || fix.filePath !== contextPath) return null; // only the file the AI was shown
  const file = files.find((f) => f.path === fix.filePath);
  if (!file) return null;
  const lines = file.content.split('\n');
  const { lineStart, lineEnd, replacement } = fix;
  if (lineStart < 1 || lineEnd < lineStart || lineEnd > lines.length) return null;
  if (lineEnd - lineStart + 1 > MAX_FIX_LINES) return null;
  if (reportedLine && Math.abs(lineStart - reportedLine) > MAX_FIX_DISTANCE) return null;
  if (!moderate(replacement).allowed) return null;
  const patched = [
    ...lines.slice(0, lineStart - 1),
    ...replacement.split('\n'),
    ...lines.slice(lineEnd),
  ];
  const next = files.map((f) => (f === file ? { ...f, content: patched.join('\n') } : f));
  if (!validateProject(next).valid) return null;
  return {
    description: fix.description,
    filePath: fix.filePath,
    lineStart,
    lineEnd,
    before: lines.slice(lineStart - 1, lineEnd).join('\n'),
    replacement,
  };
}

// Debugging assistant. The error report comes from the preview in the child's browser, so it is
// untrusted: it is cleaned, moderated, and only passed to the AI as data. The code the AI sees is
// read from the SAVED project by the server. The answer keeps facts (what the preview reported)
// apart from guesses (the AI's cause and fix).
export async function debugRun(ctx, owner, child, projectId, body) {
  const { supabase, ai, config, logger = console, moderationHook, now = () => new Date() } = ctx;
  const { versionId, explanationLanguage: language } = body;
  const report = body.error;

  const message = cleanPrompt(report.message ?? '').slice(0, MESSAGE_MAX);
  const verdict = message
    ? await moderateWithHook(message, language, moderationHook)
    : { allowed: true };
  if (!verdict.allowed) {
    try {
      await insertUsageEvent(supabase, {
        child_profile_id: owner.childProfileId ?? null,
        guest_session_id: owner.guestSessionId ?? null,
        event_type: 'debug.blocked',
        units: 1,
        metadata: { category: verdict.category },
      });
    } catch (err) {
      logger.warn?.({ err }, 'could not record debug event');
    }
    return { status: 'blocked', message: verdict.message };
  }
  const name = /^[A-Za-z]{1,30}$/.test(report.name ?? '') ? report.name : undefined;

  const project = await repo.findOwnedProject(supabase, owner, projectId);
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  const version = await repo.findVersion(supabase, versionId);
  if (!version || version.project_id !== project.id) {
    throw new AppError(404, 'NOT_FOUND', 'Version not found.');
  }

  const limit = owner.guestSessionId ? config.debug.dailyLimitGuest : config.debug.dailyLimitChild;
  const since = new Date(now().getTime() - DAY_MS).toISOString();
  if ((await countUsageSince(supabase, owner, 'ai.debug_error', since)) >= limit) {
    throw new AppError(
      429,
      'DEBUG_LIMIT_REACHED',
      "You've asked for lots of help today! Come back tomorrow for more.",
    );
  }

  const files = await loadVersionFiles(supabase, version.id); // saved, hash-checked
  const named = files.find((f) => f.path === report.filePath);
  const fallback = report.kind === 'error' ? undefined : files.find((f) => f.path === 'script.js');
  const target = named ?? fallback;

  // The reported line only counts if it really exists in the saved file.
  let line;
  let context = { projectTitle: project.title };
  if (target) {
    const lines = target.content.split('\n');
    if (named && Number.isInteger(report.line) && report.line >= 1 && report.line <= lines.length) {
      line = report.line;
    }
    const lineStart = line ? Math.max(1, line - CONTEXT_RADIUS) : 1;
    const lineEnd = line
      ? Math.min(lines.length, line + CONTEXT_RADIUS)
      : Math.min(lines.length, 40);
    context = {
      ...context,
      filePath: target.path,
      lineStart,
      lineEnd,
      code: lines
        .slice(lineStart - 1, lineEnd)
        .join('\n')
        .slice(0, MAX_CONTEXT_CHARS),
    };
  }

  const verified = {
    kind: report.kind,
    ...(name && { name }),
    ...(message && { message }),
    ...(named && { filePath: named.path }),
    ...(line && { line }),
  };

  const { data, meta } = await ai.debugError(owner, {
    error: { ...verified },
    explanationLanguage: language,
    ...(child?.age && { age: child.age }),
    rules: RULES,
    context,
  });

  const texts = [data.explanation, data.likelyCause, data.fix?.description].filter(Boolean);
  if (strings(texts).some(isUnsafeText)) {
    throw new AppError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI helper gave an unexpected answer. Please try again.',
    );
  }
  const fix = checkFix(files, data.fix, line, target?.path);
  if (data.fix && !fix) logger.warn?.('dropped a suggested fix that did not pass checks');

  return {
    status: 'ok',
    verified,
    explanation: data.explanation,
    likelyCause: data.likelyCause,
    ...(fix && { fix }),
    isMock: meta.isMock,
  };
}
