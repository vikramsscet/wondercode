# Development Guide

## Prerequisites

- Node.js 22.x, npm 10.x
- A hosted Supabase dev project (see docs/supabase-setup.md)
- Supabase CLI (from Prompt 04)

## Repository conventions

- Monorepo with npm workspaces (`apps/web`, `apps/api`), see ADR 0006.
- JavaScript with ES modules (`"type": "module"`) on both sides.
- 2-space indent, LF line endings, UTF-8 (see `.editorconfig`). ESLint and Prettier are added in Prompt 05.
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
| 04 Supabase configuration | Done, awaiting review (live check pending credentials) |
| 05 onward | Not started |
