# Progress and how to resume

_Last updated: 2026-11-21._ The roadmap is the 42 prompts in `WonderCode_Product_and_Technical_Blueprint_README.md` (section 11).

## Where we are
**Completed: Prompts 01 to 18 (18 of 42).** Next: **Prompt 19, Code validation.** Prompt 18 approved. Prompts 14 and 15 are approved and pushed (commit `d617c07`).

| Phase | Prompts | Status |
|---|---|---|
| A. Foundation | 01 to 05 | Done |
| B. Data and identity | 06 to 09 | Done (schema applied to `wondercode-dev`) |
| C. Design and navigation | 10 to 13 | Done |
| D. AI creation | 14 to 18 | 14 to 16 approved and pushed (latest `bd2eb94`); 17 approved and pushed (`b4ac27e`); 18 (generation and saving) approved; 19 not started |
| E to H | 20 to 42 | Not started |

No finished prompts are awaiting approval.

## How to resume tomorrow
1. Open the repo: `/Users/vikram.rao/testApp/wondercode`.
2. Tell Claude: **"Read docs/progress.md and docs/development.md, then start Prompt 15."** (Claude has no memory of earlier chats beyond these docs and its saved notes.)
3. Check the project still works:
   ```
   npm install
   npm test            # expect 150 API + 75 web tests passing
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
- **Git:** Prompts 02 to 17 are committed and pushed to `origin/main` (latest commit `d617c07`, "prompt safety and understanding"). Commit and push after each approved prompt, and check `git status` shows no `.env` files first.
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

- Project saves are not atomic (ADR 0017); a failed cleanup could leave orphan Storage files. Generation has only basic restrictions until Prompt 19. Not yet tried against live Supabase Storage (tests use a fake).

## Upcoming prompts, one line each
- 19 Code validation: paths, types, sizes, syntax and disallowed capabilities, no server execution.
- 20 Workspace layout: file explorer, editor area, preview area, responsive.
