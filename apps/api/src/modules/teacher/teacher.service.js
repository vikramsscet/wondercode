import { AppError } from '../../utils/AppError.js';
import { insertUsageEvent } from '../ai/usage.repository.js';
import { isUnsafeText, strings } from '../explanations/explanations.policy.js';
import { moderateWithHook } from '../prompts/prompts.moderation.js';
import { cleanPrompt, hasLetters, PROMPT_MAX, PROMPT_MIN } from '../prompts/prompts.text.js';
import * as projects from '../projects/projects.repository.js';
import { buildContext } from './teacher.context.js';
import * as repo from './teacher.repository.js';
import { RULES, fitToLimit, maxAnswerChars } from './teacher.rules.js';

export const MAX_MESSAGES_PER_CONVERSATION = 100;
const HISTORY_MESSAGES = 6;
const HISTORY_CHARS = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

const TOO_SHORT = {
  en: 'Ask me a little more, so I can help.',
  hi: 'थोड़ा और पूछो, ताकि मैं मदद कर सकूँ।',
  hinglish: 'Thoda aur pucho, taaki main help kar sakun.',
};

async function recordBlocked(supabase, logger, owner, category) {
  if (!supabase) return;
  try {
    await insertUsageEvent(supabase, {
      child_profile_id: owner.childProfileId ?? null,
      guest_session_id: owner.guestSessionId ?? null,
      event_type: 'teacher.blocked',
      units: 1,
      metadata: { category },
    });
  } catch (err) {
    logger.warn?.({ err }, 'could not record teacher event'); // never break the request
  }
}

// Which conversation to continue: the one named (must be this owner's, for this project),
// otherwise the latest for the project, otherwise none yet (it is created when the answer is saved,
// so a failed request never leaves an empty chat behind).
async function findConversation(supabase, owner, project, conversationId) {
  if (conversationId) {
    const found = await repo.findConversation(supabase, owner, conversationId);
    if (!found || found.project_id !== project.id) {
      throw new AppError(404, 'NOT_FOUND', 'Conversation not found.');
    }
    return found;
  }
  return repo.findLatestConversation(supabase, owner, project.id);
}

// Context-aware AI teacher. The question is untrusted text: cleaned and moderated first, never
// logged or echoed, and stored only when allowed. `child` is set for child profiles (age).
export async function askTeacher(ctx, owner, child, body) {
  const { supabase, ai, config, logger = console, moderationHook, now = () => new Date() } = ctx;
  const { projectId, versionId, conversationId, selection, explanationLanguage } = body;

  const text = cleanPrompt(body.question);
  if (text.length < PROMPT_MIN || !hasLetters(text) || text.length > PROMPT_MAX) {
    return { status: 'invalid', message: TOO_SHORT[explanationLanguage], followUps: [] };
  }
  const verdict = await moderateWithHook(text, explanationLanguage, moderationHook);
  if (!verdict.allowed) {
    await recordBlocked(supabase, logger, owner, verdict.category);
    return { status: 'blocked', message: verdict.message, followUps: [] };
  }

  const { context } = await buildContext(ctx, owner, {
    projectId,
    versionId,
    selection,
    explanationLanguage,
  });
  const project = await projects.findOwnedProject(supabase, owner, projectId);
  const existing = await findConversation(supabase, owner, project, conversationId);

  // Usage limit, checked before any AI call.
  const limit = owner.guestSessionId
    ? config.teacher.dailyLimitGuest
    : config.teacher.dailyLimitChild;
  const since = new Date(now().getTime() - DAY_MS).toISOString();
  const used = await repo.countAnswersSince(supabase, owner, since);
  if (used >= limit) {
    throw new AppError(
      429,
      'TEACHER_LIMIT_REACHED',
      "You've asked lots of questions today! Come back tomorrow for more.",
    );
  }

  const nowIso = now().toISOString();
  const earlier = existing ? await repo.listMessages(supabase, existing.id, nowIso) : [];
  if (earlier.length >= MAX_MESSAGES_PER_CONVERSATION) {
    throw new AppError(
      409,
      'TEACHER_CONVERSATION_FULL',
      'This chat is full. Clear it to start a fresh one.',
    );
  }
  const history = earlier.slice(-HISTORY_MESSAGES).map((m) => ({
    role: m.role,
    text: m.content.slice(0, HISTORY_CHARS),
  }));

  const age = child?.age;
  const limitChars = maxAnswerChars(age);
  const { data, meta } = await ai.answerTeacherQuestion(owner, {
    question: text,
    explanationLanguage,
    ...(age && { age }),
    maxAnswerChars: limitChars,
    rules: RULES,
    context,
    ...(history.length > 0 && { history }),
  });

  // Any provider's answer must be link-free, HTML-free and pass moderation.
  if ([data.answer, ...data.followUps, ...strings(data.visual)].some(isUnsafeText)) {
    throw new AppError(
      502,
      'AI_INVALID_RESPONSE',
      'The AI helper gave an unexpected answer. Please try again.',
    );
  }
  const answer = fitToLimit(data.answer, limitChars);

  const expiresAt = new Date(now().getTime() + config.teacher.retentionDays * DAY_MS).toISOString();
  const conversation =
    existing ??
    (await repo.insertConversation(supabase, owner, {
      project_id: project.id,
      explanation_language: explanationLanguage,
    }));
  // Every row lists every column: a bulk insert fills missing keys with NULL, not the default.
  await repo.insertMessages(supabase, [
    {
      conversation_id: conversation.id,
      role: 'child',
      content: text,
      is_mock: false,
      visual: null,
      expires_at: expiresAt,
    },
    {
      conversation_id: conversation.id,
      role: 'teacher',
      content: answer,
      is_mock: Boolean(meta.isMock),
      visual: data.visual ?? null,
      expires_at: expiresAt,
    },
  ]);
  await repo.touchConversation(supabase, conversation.id, nowIso);

  return {
    status: 'ok',
    conversationId: conversation.id,
    answer,
    language: data.language,
    followUps: data.followUps,
    ...(data.visual && { visual: data.visual }),
    isMock: meta.isMock,
    remainingToday: Math.max(limit - used - 1, 0),
  };
}

// The latest chat for a project (restores the panel after a reload), or an empty one.
export async function getConversation({ supabase, now = () => new Date() }, owner, projectId) {
  const project = await projects.findOwnedProject(supabase, owner, projectId);
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  const conversation = await repo.findLatestConversation(supabase, owner, projectId);
  if (!conversation) return { conversationId: null, messages: [] };
  const messages = await repo.listMessages(supabase, conversation.id, now().toISOString());
  return {
    conversationId: conversation.id,
    messages: messages.map((m) => ({
      role: m.role,
      text: m.content,
      isMock: m.is_mock,
      ...(m.visual && { visual: m.visual }),
      createdAt: m.created_at,
    })),
  };
}

// "Clear chat": the child (or guest) removes their own conversation.
export async function clearConversation({ supabase }, owner, conversationId) {
  const found = await repo.findConversation(supabase, owner, conversationId);
  if (!found) throw new AppError(404, 'NOT_FOUND', 'Conversation not found.');
  await repo.deleteConversation(supabase, conversationId);
  return { deleted: true };
}

// Retention: removes expired messages and chats that have been idle longer than the retention.
export async function purgeExpiredTeacherData(supabase, retentionDays, now = new Date()) {
  const messages = await repo.deleteExpiredMessages(supabase, now.toISOString());
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS).toISOString();
  const conversations = await repo.deleteIdleConversations(supabase, cutoff);
  return { messages: messages.length, conversations: conversations.length };
}
