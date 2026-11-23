# Development Guide

## Prerequisites

- Node.js 22.x, npm 10.x
- A hosted Supabase dev project (see docs/supabase-setup.md)
- Supabase CLI (from Prompt 04)

## Repository conventions

- Monorepo with npm workspaces (`apps/web`, `apps/api`), see ADR 0006.
- JavaScript with ES modules (`"type": "module"`) on both sides.
- 2-space indent, LF line endings, UTF-8 (see `.editorconfig`). Run `npm run lint` and `npm run format` from the root (ESLint + Prettier). API rules: docs/api/conventions.md.
- File names: `kebab-case.js` for backend, `PascalCase.jsx` for React components.
- API: `/api/v1`, JSON, camelCase fields, consistent envelope (see the architecture doc).
- Tests: Vitest; Supertest for API. Each prompt ships tests for its scope.

## Environment variables

Each project gets a committed `.env.example`; real `.env` files are git-ignored. Planned names (not yet used):

- Frontend: `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Backend: `PORT`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER`, `AI_MODEL`, provider API keys

The service-role key and AI keys must never appear in frontend code or `VITE_*` variables.

## Workflow

1. Work on one roadmap prompt at a time (blueprint section 11).
2. Inspect existing code first; reuse existing patterns; do not refactor unrelated modules.
3. Implement only the current prompt's scope, with tests and doc updates.
4. Review and approve before starting the next prompt.

## Status

| Prompt | Status |
|---|---|
| 01 Repository and architecture | Done (docs only) |
| 02 Frontend foundation | Done |
| 03 Backend foundation | Done |
| 04 Supabase configuration | Done (live connection verified) |
| 05 API and coding standards | Done, awaiting review |
| 06 Database schema | Done (applied to wondercode-dev) |
| 07 Parent authentication | Done (verified live) |
| 08 Child profile API | Done, awaiting review (verified live; cross-parent check covered by tests only) |
| 09 Guest trial sessions | Done, awaiting review (verified live) |
| 10 Design system | Done, awaiting review |
| 11 Landing and onboarding | Done, awaiting review |
| 12 Child dashboard (with profile picker, header avatar, switching) | Done, awaiting review |
| 13 Parent dashboard shell | Done, awaiting review |
| 14 AI provider abstraction (mock) | Done, approved |
| 15 Prompt safety and understanding (`POST /prompts/analyze`) | Done, approved |
| 16 Project planning (`POST /prompts/plan`) | Done, awaiting review |
| 17 Prompt Studio UI (`/create`, `/try/create`) | Done, approved |
| 18 Generation and saving (`POST /projects/generate`, `GET /projects/:id`) | Done, approved |
| 19 Code validation (`validateProject`, `POST /projects/validate`) | Done, approved |
| 20 Workspace layout (`/workspace`, `/try/workspace`) | Done, approved |
| 21 Monaco editor (edit, switch files, selected lines) | Done, approved |
| 22 Sandboxed preview (`PreviewPane`, Run button) | Done, approved |
| 23 Run, Stop and Restart (`usePreviewRunner`) | Done, approved |
| 24 Generation to workspace (`/workspace/:projectId`, drafts) | Done, awaiting review |
| 25 Versioned code explanations (`POST /projects/:id/explanations`) | Done, approved |
| 26 AI Teacher UI (`POST /teacher/ask`, `TeacherPanel`) | Done, approved |
| 27 Context-aware AI teacher (context, age rules, limits, stored chats) | Done, approved |
| 28 Visual explanations (`visual` format, `VisualExplanation`) | Done, approved |
| 29 Experiment Mode (`POST /projects/:id/experiments`, "Try a change") | Done, approved |
| 30 onward | Not started |
