# Experiment Mode API (Prompt 29)

`POST /api/v1/projects/:projectId/experiments`: a natural-language change creates a **new version** of a project. Children (parent JWT + `X-Child-Id`) and guests (`X-Guest-Token`). No new migration (uses `project_versions` with origin `refined`).

## Request (strict)
```json
{ "baseVersionId": "uuid", "instruction": "Make the background blue", "language": "en" }
```
`baseVersionId` is the version the child is looking at and must still be the project's current version.

## What the server does, in order
1. **Clean and moderate the instruction** (Prompt 15 rules). Too short, no letters or over 500 characters gives `status: "invalid"`; unsafe gives `status: "blocked"` with a calm localized message. Neither calls the AI, is stored, or uses up the daily limit (a blocked one only records its category as `experiment.blocked`).
2. **Ownership and version:** the project must be the caller's (else 404). `baseVersionId` must equal `current_version_id`, else `409 VERSION_OUTDATED`.
3. **Limits, before any AI call:** at most `PROJECT_MAX_VERSIONS` versions per project (default 30, `409 PROJECT_VERSION_LIMIT`) and a rolling 24-hour limit of experiments per owner, `EXPERIMENT_DAILY_LIMIT_CHILD` (30) or `EXPERIMENT_DAILY_LIMIT_GUEST` (5), else `429 EXPERIMENT_LIMIT_REACHED`.
4. **Ask the AI** (`refineProject`) with the base version's saved files (hash-checked), the cleaned instruction and the language. Nothing else is shared.
5. **Hold the result to the generation rules:** the returned files must pass the full project validator (Prompt 19) as a set, and the change summaries must pass the shared text policy (no links, no HTML, moderation). One automatic retry, then a generic `502 AI_INVALID_RESPONSE`.
6. **Work out what really changed** by comparing file hashes with the base version. The AI's own list of changes is advisory: only really changed files are reported, with the AI's summary or a generic "Updated this file." If nothing changed: `status: "no_change"` and no version is created.
7. **Save as a new version** (earlier versions are never touched): upload all three files under `…/v<N>/…`, insert the `project_versions` row (origin `refined`, the instruction as `prompt`, the plan carried over), insert the file manifest, then move `current_version_id` from the base to the new version **only if it still equals the base** (compare-and-set). If another change got there first, or any step fails, what was created is removed and the answer is `409 VERSION_OUTDATED` (or a generic 500). Saves stay best effort, as in ADR 0017.

## Response `data`
```json
{ "status": "ok",
  "project": { … }, "version": { "id": "uuid", "versionNumber": 2, "origin": "refined" },
  "previousVersionId": "uuid",
  "files": [ { "path": "style.css", "language": "css", "content": "…", "sizeBytes": 123 } ],
  "changedFiles": [ { "path": "style.css", "summary": { "en": "…", "hi": "…", "hinglish": "…" } } ],
  "validated": true, "validation": { … }, "isMock": true }
```
or `{ "status": "no_change" | "blocked" | "invalid", "message": "…" }` (HTTP 200).

## Privacy
The instruction is never logged or echoed. It is stored only as the version's `prompt` (as with generation) and nowhere in `usage_events`.

## Not included
Opening, comparing or restoring older versions (Prompts 32 and 33), per-minute rate limits (Prompt 37).
