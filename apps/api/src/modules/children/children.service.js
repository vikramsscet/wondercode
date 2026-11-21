import { MAX_CHILDREN_PER_PARENT } from '@wondercode/shared';
import { AppError } from '../../utils/AppError.js';
import * as repo from './children.repository.js';

// Same response whether the child does not exist or belongs to someone else.
const notFound = () => new AppError(404, 'NOT_FOUND', 'Child profile not found.');

export async function listChildren(supabase, parentId) {
  return (await repo.listChildren(supabase, parentId)).map(repo.toChild);
}

// Returns the child only if it belongs to the parent; otherwise throws 404.
export async function getOwnedChild(supabase, parentId, childId) {
  const row = await repo.findChild(supabase, parentId, childId);
  if (!row) throw notFound();
  return repo.toChild(row);
}

export async function createChild(supabase, parentId, input) {
  // Note: count-then-insert is not atomic; two simultaneous requests could exceed the limit by one.
  if ((await repo.countChildren(supabase, parentId)) >= MAX_CHILDREN_PER_PARENT) {
    throw new AppError(
      409,
      'CHILD_LIMIT_REACHED',
      `You can have up to ${MAX_CHILDREN_PER_PARENT} child profiles.`,
    );
  }
  const row = await repo.insertChild(supabase, {
    parent_id: parentId,
    display_name: input.displayName,
    age: input.age,
    avatar_key: input.avatarKey,
    explanation_language: input.explanationLanguage,
    interests: input.interests,
  });
  return repo.toChild(row);
}

export async function updateChild(supabase, parentId, childId, input) {
  const patch = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.age !== undefined) patch.age = input.age;
  if (input.avatarKey !== undefined) patch.avatar_key = input.avatarKey;
  if (input.explanationLanguage !== undefined)
    patch.explanation_language = input.explanationLanguage;
  if (input.interests !== undefined) patch.interests = input.interests;
  const row = await repo.updateChild(supabase, parentId, childId, patch);
  if (!row) throw notFound();
  return repo.toChild(row);
}

export async function deleteChild(supabase, parentId, childId) {
  const row = await repo.softDeleteChild(supabase, parentId, childId);
  if (!row) throw notFound();
  return { id: row.id, deleted: true };
}
