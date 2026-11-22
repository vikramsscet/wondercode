# Projects API (Prompt 18)

Auth (both routes): `X-Guest-Token`, or `Authorization: Bearer <jwt>` + `X-Child-Id` (middleware `requireOwner`).

## POST /api/v1/projects/generate
Body (strict): `{ plan, prompt?, language? }`. `plan` is the approved plan from `/prompts/plan`, fully re-validated server side (schema + plan policy), and `prompt` is re-moderated (422 `PROMPT_NOT_ALLOWED`).

Steps: quota check -> `AIService.generateProjectCode` -> `generation.policy.js` -> upload to Storage -> insert `projects`, `project_versions` (v1, origin `generated`), `project_files` -> set `current_version_id`. Responds `201` with `{ project, version, files[{path,language,content,sizeBytes}], validated: false, isMock, learningConcepts }`.

Limits: guests `GUEST_MAX_PROJECTS` (409 `GUEST_LIMIT_REACHED`); children 50 active projects (409 `PROJECT_LIMIT_REACHED`).

## GET /api/v1/projects/:projectId
Owner-scoped (another owner gets 404). Returns the current version with file contents; each file is checked against its stored sha-256 (500 if it does not match).

## Generation policy (any provider)
- Exactly `index.html` (html), `style.css` (css), `script.js` (javascript); no extra, missing or duplicate files.
- Each file 1 byte to 200 KB, total at most 400 KB.
- HTML: only `<script src="script.js">`; URLs only to `style.css`, `script.js` or `#anchors`; no iframe/frame/object/embed/base/form or meta refresh.
- CSS: no `@import`, no external URLs, no `url()` other than fragments.
- JS: no fetch/XHR/WebSocket/EventSource/sendBeacon/workers/imports/require, and no URL-like strings.
- Violations return a generic `502 AI_INVALID_RESPONSE`; nothing is saved.

Since Prompt 19 the generation rules above are enforced by the shared validator (`docs/api/validation.md`). `validated: true` means parsed and statically checked; the code has not been run. Responses include a `validation` result, and `POST /projects/validate` validates files without saving.
