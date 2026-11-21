import { AppError } from '../../utils/AppError.js';
import { findParentProfile } from './auth.repository.js';

export async function getParentContext(supabase, auth) {
  const profile = await findParentProfile(supabase, auth.userId);
  if (!profile) {
    // The sign-up trigger creates this row; a missing row means a data problem, not a client error.
    throw new AppError(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }
  return {
    id: profile.id,
    email: auth.email,
    displayName: profile.display_name,
    uiLanguage: profile.ui_language,
    createdAt: profile.created_at,
  };
}
