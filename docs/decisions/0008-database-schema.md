# ADR 0008: Database schema design

Status: Accepted

## Decision
- Child-owned tables carry `child_profile_id` with cascading deletes; projects have exactly one owner (child or guest).
- Children are profiles, not Auth users. The API enforces parent -> child -> project ownership; RLS is deny-by-default defence in depth.
- Project versions, files and usage events are immutable (update-blocking triggers). Versions are inserted only when complete, so there is no generation status column.
- Child deletion is a soft delete (`deleted_at`) followed by a purge job (including Storage objects).
- Avatar keys and interest tags are validated by the app against fixed lists; the database checks only the format.
- `parent_profiles.ui_language` holds the UI language; `child_profiles.explanation_language` holds the explanation language.
- AI conversation and explanation tables are deferred to their feature prompts, with the same child-ownership pattern.

## Consequences
Isolation depends on every query being scoped in the API, so repositories must always filter by `child_profile_id`. Adding avatars or interests needs no migration.
