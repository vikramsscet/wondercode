import { z } from 'zod';
import {
  AGE_MIN,
  AGE_MAX,
  AVATAR_KEYS,
  EXPLANATION_LANGUAGES,
  INTEREST_TAGS,
  MAX_INTERESTS,
} from '@wondercode/shared';

const displayName = z.string().trim().min(1).max(30);
const age = z.number().int().min(AGE_MIN).max(AGE_MAX);
const avatarKey = z.enum(AVATAR_KEYS);
const explanationLanguage = z.enum(EXPLANATION_LANGUAGES);
const interests = z
  .array(z.enum(INTEREST_TAGS))
  .max(MAX_INTERESTS)
  .refine((list) => new Set(list).size === list.length, 'Interests must not repeat.');

export const childIdParams = z.object({ childId: z.string().uuid() });

export const createChildBody = z
  .object({
    displayName,
    age,
    avatarKey,
    explanationLanguage: explanationLanguage.default('en'),
    interests: interests.default([]),
  })
  .strict();

export const updateChildBody = z
  .object({
    displayName: displayName.optional(),
    age: age.optional(),
    avatarKey: avatarKey.optional(),
    explanationLanguage: explanationLanguage.optional(),
    interests: interests.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');
