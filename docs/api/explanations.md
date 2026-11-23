# Code explanations API (Prompt 25)

Explains selected lines of a **saved** project version. Same auth as the other project routes: a parent JWT with `X-Child-Id`, or `X-Guest-Token`. Envelope as usual.

## POST `/api/v1/projects/:projectId/explanations`
Body (strict):
```json
{ "versionId": "uuid", "filePath": "script.js", "lineStart": 2, "lineEnd": 3,
  "codeHash": "<sha-256 hex of exactly lines 2-3>", "explanationLanguage": "en" }
```
`explanationLanguage` is `en`, `hi` or `hinglish` (default `en`). Lines are 1-based and counted with `content.split("\n")`; the hashed text is those lines joined with `\n`, UTF-8.

The client **never sends code**. The server:
1. finds the project for this owner (else 404), the version (must belong to the project, else 404) and the file in that version (else 404);
2. reads the saved file from Storage and checks it against the manifest hash (mismatch: 500, nothing explained);
3. checks the range: inside the file, at most 40 lines, not blank (else `422 EXPLANATION_RANGE_INVALID`);
4. recomputes the hash of those lines; if it differs from `codeHash` the code has changed: `409 EXPLANATION_STALE`;
5. returns the cached explanation if one exists for (version, file, lines, hash, language), otherwise calls the AI (`explainCode`, metered in `usage_events`);
6. applies the explanation policy (no links, no HTML, passes prompt moderation) or returns a generic `502 AI_INVALID_RESPONSE` and stores nothing;
7. stores the row with binding fields taken from the **server's own checks**, never from the provider.

Response `data`:
```json
{ "id": "uuid", "versionId": "uuid", "filePath": "script.js", "lineStart": 2, "lineEnd": 3,
  "codeHash": "…", "explanationLanguage": "en", "concept": "function",
  "explanation": { "en": "…", "hi": "…", "hinglish": "…" },
  "realLifeExample": { "en": "…", "hi": "…", "hinglish": "…" },
  "tryThis": "…", "visual": { "title": { "en": "…" }, "steps": [ … ] }, "isMock": true, "stale": false, "cached": false }
```
The response and logs never contain the code.

`visual` is optional; see [visual explanations](../ai/visual-explanations.md).

## GET `/api/v1/projects/:projectId/explanations?versionId=`
Saved explanations of a version (default: the current one), oldest first. `stale` is true when the explanation's version is no longer the project's current version.

## Stale handling
Versions are immutable, so an explanation never changes meaning. When a project moves to a newer version, older explanations are marked `stale: true`, and a request for changed lines fails the hash check (409) and gets a fresh explanation for the new version.

## Storage
Table `code_explanations` (migration `20261122000007_code_explanations.sql`): owner (child or guest, exactly one), `version_id`, `file_path`, line range, `code_hash`, `explanation_language`, `explanation_payload` JSONB, unique per binding, immutable, RLS on with a parent-read policy, no `anon` access. **Apply the migration in the Supabase dashboard before using the live API.**

## Not included
Explaining unsaved edits, per-user rate limits (Prompt 37), visual explanations (Prompt 28), teacher chat (26, 27).
