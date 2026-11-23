# Database Schema

Migrations: `supabase/migrations/` (apply in filename order; see [supabase-setup](../supabase-setup.md)). Seed: `supabase/seed.sql` (learning catalog only, idempotent). Decision record: [ADR 0008](../decisions/0008-database-schema.md).

## Tables

| Table | Purpose |
|---|---|
| `parent_profiles` | One per Supabase Auth user (`id` = `auth.users.id`); created by trigger on sign-up. `ui_language` (`en`/`hi`). |
| `child_profiles` | Parent-managed profile. `id` is the `child_profile_id`. `display_name`, `age` (8-12), `avatar_key`, `explanation_language`, `interests` (max 5 tags), `deleted_at` (soft delete). |
| `guest_sessions` | Temporary trial sessions; `session_token_hash`, `expires_at`, `usage_limit`. |
| `consent_records` | Parent consent history (type, policy version, granted/revoked). |
| `projects` | Owned by exactly one of `child_profile_id` / `guest_session_id` (CHECK). `current_version_id` points to the active version. |
| `project_versions` | Immutable. Unique `(project_id, version_number)`; `origin` = generated/refined/edited/restored; `project_plan` JSONB. |
| `project_files` | Immutable manifest per version: `file_path` (flat, no `/`), `language` (html/css/javascript), `storage_key`, sha-256 `content_hash`, `size_bytes` (<= 200 KB). |
| `learning_concepts`, `learning_paths`, `learning_path_steps`, `challenges` | Shared catalog (seeded). |
| `challenge_attempts` | Per child and challenge: status, attempts, hints used. |
| `learning_progress` | Per child and concept: mastery status and evidence count. |
| `usage_events` | Append-only quota accounting for a child or guest. `metadata` must never contain prompts or child content. |

`code_explanations` (Prompt 25, migration `20261122000007`): immutable explanation per version, file, line range, code hash and language; one owner (child or guest); RLS with a parent-read policy. Other AI tables (`ai_interactions`, `teacher_conversations`, `teacher_messages`) are created with their features (Prompts 14, 27). They must carry `child_profile_id` (or `guest_session_id`) like the other child-owned tables.

## Isolation model
- Every child-owned table references `child_profiles` with `ON DELETE CASCADE`, so deleting a child removes all of that child's data.
- **The API is the enforcement point.** It uses the service role, verifies the parent's JWT, then checks the selected child belongs to that parent and scopes every query by `child_profile_id`.
- **RLS is defence in depth**, deny by default. Children are not Auth users, so policies can only express parent-level access: parents read their own children's data; parent and child writes go through the API. `guest_sessions` and `usage_events` have no policies (service role only). `anon` has no table access.

## Rules enforced by the database
Child age 8-12; name 1-30 chars; avatar key format; <= 5 interest tags; exactly one project owner; unique version numbers; immutable versions, files and usage events; allowed file languages and size; private `project-files` storage bucket.

## Rules left to the API
- Allowed `avatar_key` and interest tag values (shared app list).
- Maximum children per parent (planned: 5).
- Allocating `version_number` and switching `current_version_id` atomically (SQL function / RPC, added with project versioning).
- Guest quotas and expiry cleanup; guest-owned rows cascade when the session row is deleted.

## Deletion
Deleting a child sets `deleted_at` (hidden by RLS and API). A purge job later hard-deletes the row, which cascades. **Database cascades do not delete Storage objects**, so the purge must also remove `project-files/<storage_key>` objects first. Consent records are deleted with the parent; revisit retention during the legal review.

## Storage layout
Bucket `project-files` (private). Key: `{project_id}/{version_id}/{file_path}`; accessed only through the backend.

## Verification performed
The migrations and seed were run in an in-memory Postgres (PGlite) with stubbed `auth`/`storage` schemas: 32 checks covering constraints, immutability, cascade deletion, seed idempotency, and RLS isolation between two parents. This is not identical to Supabase; run the migrations on `wondercode-dev` and re-check there.
