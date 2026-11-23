# Progress and how to resume

_Last updated: 2026-11-23._ The roadmap is the 42 prompts in `WonderCode_Product_and_Technical_Blueprint_README.md` (section 11).

## Where we are
**Completed: Prompts 01 to 28 (28 of 42).** Next: **Prompt 29, Experiment mode.** Prompts 01 to 28 are approved and pushed.

| Phase | Prompts | Status |
|---|---|---|
| A. Foundation | 01 to 05 | Done |
| B. Data and identity | 06 to 09 | Done (schema applied to `wondercode-dev`) |
| C. Design and navigation | 10 to 13 | Done |
| D. AI creation | 14 to 19 | 14 to 16 approved and pushed (latest `bd2eb94`); 17 approved and pushed (`b4ac27e`); 18 approved and pushed (`4a5cab4`); 19 (code validation) approved and pushed |
| E. Workspace and preview | 20 to 24 | 20 (workspace layout) approved and pushed (`330fd6f`); 21 (Monaco) approved and pushed (`20168f3`); 22 (sandboxed preview) approved and pushed (`f685bb9`); 23 (run, stop, restart) approved and pushed (`de8914e`); 24 (generation to workspace) approved and pushed (`f40f033`); 25 (explanations) approved and pushed (`93858eb`); 26 (AI teacher UI) approved and pushed (`66762f6`); 27 (context-aware teacher) approved and pushed (`6e3fa80`); 28 (visual explanations) approved and pushed (`845cee5`); 29 (experiment mode) approved and pushed (`307afd3`); 30 (debugging assistant) done, pushed, awaiting approval; migration `20261122000009` to be applied; migration `20261122000008` applied to wondercode-dev; migration `20261122000007` applied to wondercode-dev |
| F to H | 25 to 42 | Not started |

## How to resume tomorrow
1. Open the repo: `/Users/vikram.rao/testApp/wondercode`.
2. Tell Claude: **"Read docs/progress.md and docs/development.md, then check Prompt 30 approval and start Prompt 31."** (Claude has no memory of earlier chats beyond these docs and its saved notes.)
3. Check the project still works:
   ```
   npm install
   npm test            # expect 327 API + 193 web tests passing
   npm run lint
   npm run dev:api     # http://localhost:3000/api/v1/health
   npm run dev:web     # http://localhost:5173   (style guide at /design)
   npm run check:supabase -w apps/api   # expect OK
   ```
4. Env files (git-ignored, must exist): `apps/api/.env` and `apps/web/.env`, copied from the `.env.example` files. See `docs/supabase-setup.md`.

## Working agreement
- One roadmap prompt at a time. Claude inspects the code, explains the approach, implements only that prompt's scope, runs tests and lint, updates docs, summarises, then **waits for approval**.
- Ask before significant architectural assumptions. Record significant decisions as ADRs in `docs/decisions/`.
- Never commit secrets. The service-role key stays in `apps/api/.env` only.

## Things to know
- **Git:** Prompts 02 to 23 are committed and pushed to `origin/main` . Commit and push after each approved prompt, and check `git status` shows no `.env` files first.
- **Never put real keys in `.env.example`.** Real values belong only in the git-ignored `.env` files.
- Supabase project is the dev one only; production is not configured. Migrations were applied by pasting SQL in the dashboard.
- Mock AI is the only provider; real providers are deferred (ADR 0002, `docs/ai/provider-architecture.md`).
- Sample data on the child dashboard is labelled "Preview" and lives in `apps/web/src/features/dashboard/mockData.js`.
- Local Node is 22.11, which is why web tests use `happy-dom` (jsdom needs 22.12 or later).

## Open items and known gaps
- Parent PIN / re-authentication is deferred: a child can reach the parent area via Switch profile, then the profiles page.
- Child deletion is a soft delete only. The purge job (rows, Storage files, guest sessions) is not built.
- Guest-session purge script exists (`npm run purge:guests -w apps/api`) but is not scheduled.
- Parent-vs-parent isolation has only been tested with a fake database, not live (needs a second throwaway account).
- Child limit of 5 is checked in the API with count then insert, so a race could allow a sixth.
- Avatars are emoji placeholders; the landing page uses emoji instead of illustrations; copy needs review and Hindi localisation.
- Email confirmation is on by default in Supabase, so new parents must confirm their email before signing in.
- Prompt moderation is rule-based only (ADR 0014); word lists need educator review and a real moderation model. Code validation (19), quotas and rate limits (37), observability (40) and the security and privacy review (38) are still to do. Legal review of child-privacy consent is needed before any public launch.

- Project saves are not atomic (ADR 0017); a failed cleanup could leave orphan Storage files. Validation is static only (ADR 0018): the sandboxed preview is the real boundary. Not yet tried against live Supabase Storage (tests use a fake).

## Upcoming prompts, one line each

- Local `apps/api/.env.example` and `apps/web/.env.example` contain real Supabase keys (uncommitted). Never stage them; restore placeholders and rotate the service-role key.
- Monaco and the sandbox preview have only been unit-tested with mocks / happy-dom; do a manual browser check at `/workspace` (Run, Stop, Restart, fetch must be blocked).
- `npm install` can hang on this machine; run installs in your own terminal.
- No "My projects" list yet (only the studio's saved step opens a project) and edits cannot be saved to the server until versions (Prompt 29). Local drafts are in `localStorage` (ADR 0023).
- Migration `20261122000007_code_explanations.sql` was applied to wondercode-dev by the user. Explanations have only been tested with the fake database and mock AI, not end to end against live Supabase with a real signed-in user.
- Migration `20261122000008_teacher_conversations.sql` is applied to wondercode-dev. `npm run purge:teacher -w apps/api` scheduled. New optional env vars `TEACHER_DAILY_LIMIT_CHILD`, `TEACHER_DAILY_LIMIT_GUEST`, `TEACHER_RETENTION_DAYS` are documented in `docs/api/teacher.md` (not added to `.env.example`, which holds local real keys).
- Lesson: supabase-js bulk inserts turn missing keys into NULL (not column defaults). The fake database now copies this; always set every column in array inserts.
- Migration `20261122000009_teacher_message_visuals.sql` must be applied in the Supabase SQL editor (adds `teacher_messages.visual`); until then the live teacher fails to save messages.
- Experiment Mode (Prompt 29) needs no migration. New optional env vars `EXPERIMENT_DAILY_LIMIT_CHILD`, `EXPERIMENT_DAILY_LIMIT_GUEST`, `PROJECT_MAX_VERSIONS` are documented in `docs/api/experiments.md`. Older versions cannot be opened from the app until Prompts 32 and 33.
- Debugging assistant (Prompt 30) needs no migration. New optional env vars `DEBUG_DAILY_LIMIT_CHILD`, `DEBUG_DAILY_LIMIT_GUEST` are in `docs/api/debug.md`. The error-line mapping assumes browsers number inline-script lines by page line: confirm by hand in a real browser (see `docs/ui/debugging.md`).
