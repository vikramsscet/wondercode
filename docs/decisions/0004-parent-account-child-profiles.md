# ADR 0004: Parent account with multiple child profiles

Status: Accepted

## Decision
- One parent account (Supabase Auth) manages multiple child profiles, each with a unique `child_profile_id`.
- Children have no email/password. After parent sign-in a profile selection screen is shown; the active child's avatar and name appear in the header; switching is free and needs no PIN.
- Child fields: display name, integer age (8–12 enforced, no date of birth, parent-editable), `avatar_key`, learning preferences.
- Avatars: fixed built-in set; only `avatar_key` stored; assets live in the frontend; no photo uploads.
- Backend validates on every request that the selected child belongs to the authenticated parent. Projects, progress, challenges and AI conversations are isolated per child.
- Parent dashboard is separate from the child interface; parent-only functionality is not exposed in child-facing UI. Parent PIN/re-authentication is deferred to a future prompt.
- Guest mode is independent of parent-managed accounts.

## Scheduled
Schema Prompt 06; auth Prompt 07; child profiles Prompt 08; guest Prompt 09.
