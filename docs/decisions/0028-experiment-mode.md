# 0028: Experiment Mode creates new versions with compare-and-set

Status: accepted (Prompt 29)

## Decision
- A natural-language change calls `refineProject` on the saved base version and saves the result as a **new immutable version** (origin `refined`). Earlier versions and their files are never modified.
- The changed files are determined by comparing hashes on the server; the AI's own list of changes is advisory.
- The result must pass the same checks as generation (Prompt 19 validator on the whole file set, shared text policy on summaries), with one retry.
- Concurrency: the request names the base version, and the project is only moved to the new version if it is still on that base (`UPDATE ... WHERE current_version_id = base`). A lost race or any failed step removes what was created and returns `409 VERSION_OUTDATED`. The unique `(project_id, version_number)` constraint is a second guard.
- All three files are stored per version (self-contained versions, simple restore later) at the cost of some extra Storage.
- Limits: 30 versions per project, and daily experiment limits (30 for children, 5 for guests), all configurable and checked before the AI call.
- The UI blocks experiments while there are unsaved edits, because a change is made from the saved project.

## Consequences
- Saves stay non-atomic across Storage and the database (ADR 0017); cleanup is best effort.
- There is no way to open an earlier version from the app until Prompts 32 and 33.
- Per-minute rate limits wait for Prompt 37.
