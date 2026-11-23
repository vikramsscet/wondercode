# Debugging assistant API (Prompt 30)

`POST /api/v1/projects/:projectId/debug`: explains a problem the preview reported, and may suggest one small fix. Children (parent JWT + `X-Child-Id`) and guests (`X-Guest-Token`). No migration.

## Request (strict)
```json
{ "versionId": "uuid",
  "error": { "kind": "error", "name": "ReferenceError",
             "message": "Uncaught ReferenceError: scor is not defined",
             "filePath": "script.js", "line": 3, "column": 3 },
  "explanationLanguage": "en" }
```
`kind` is `error`, `unresponsive` or `blocked`. `name`, `message`, `filePath`, `line` and `column` are optional. **No code is accepted from the browser.**

## What is checked, and what is a guess
The error report comes from the preview running in the child's browser, so the server treats it as **untrusted data**: it is cleaned, clipped to 300 characters, moderated, and only ever passed to the AI as data. The server never runs code, so "verified" means "reported by the real preview run", not "proved by the server".

The response keeps two things apart:
- `verified`: what the preview reported (kind, error name, message, and the file and line if they exist in the saved file);
- `explanation`, `likelyCause` and `fix`: the AI's interpretation. The UI labels these "What it means" and "My guess (not checked)".

## What the server does, in order
1. Clean and moderate the message. Unsafe: `status: "blocked"` with a calm localized message, no AI call, only the category recorded (`debug.blocked`).
2. Project must be the caller's, and the version must belong to it (else 404).
3. Daily limit before any AI call: `DEBUG_DAILY_LIMIT_CHILD` (40) or `DEBUG_DAILY_LIMIT_GUEST` (5) per rolling 24 hours, else `429 DEBUG_LIMIT_REACHED`.
4. Read the **saved** files of the version (hash-checked). A reported `line` counts only if it exists in the named saved file; the AI gets up to 11 lines around it (2,000 characters). For `unresponsive` and `blocked` reports, the first 40 lines of `script.js`.
5. Call the AI (`debugError`, with the child's age for children and the teaching rules) and apply the shared text policy (no links, no HTML, moderation) to the explanation, cause and fix description, else a generic `502 AI_INVALID_RESPONSE`.
6. **Check the fix** or drop it (the explanation is kept). A fix survives only if: it is in the file the AI was shown; it covers 1 to 10 lines inside the file within 10 lines of the reported line; the replacement is at most 600 characters and passes moderation; and the whole project, with the fix applied to a copy, still passes the Prompt 19 validator. The `before` text is taken from the saved file, never from the AI.

## Response `data`
```json
{ "status": "ok",
  "verified": { "kind": "error", "name": "ReferenceError", "message": "…", "filePath": "script.js", "line": 3 },
  "explanation": { "en": "…", "hi": "…", "hinglish": "…" },
  "likelyCause": { "en": "…", "hi": "…", "hinglish": "…" },
  "fix": { "description": { … }, "filePath": "script.js", "lineStart": 3, "lineEnd": 3,
           "before": "  scor += 1;", "replacement": "let scor = 0;\n  scor += 1;" },
  "isMock": true }
```
`fix` is optional. A blocked message gives `{ "status": "blocked", "message": "…" }` (HTTP 200).

## Privacy
Error text and code are never logged or stored. `usage_events` holds only the metered call and, for blocked messages, the category.

## Not included
Explaining unsaved code (the saved code must be what ran), multi-file or multi-hunk fixes, static (non-runtime) checks (Prompt 19 already covers them).
