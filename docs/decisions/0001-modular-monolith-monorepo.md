# ADR 0001: Modular monolith in an npm-workspaces monorepo

Status: Accepted (layout superseded by ADR 0006)

## Context
Small team, MVP scope, need for fast iteration and shared tooling. The blueprint requires a modular Express backend and a React frontend.

## Decision
- One repository containing `frontend/`, `backend/`, `supabase/` and `docs/`, using npm workspaces.
- Backend is a modular monolith with controller → service → repository layering per module.

## Consequences
- Single place for CI, linting and docs; easy cross-cutting changes.
- Modules can be extracted into services later if load or security demands it.
- Frontend and backend still deploy independently.

## Open decisions (not yet made)
Default AI provider and model, hosting vendor, domain, and how children switch profiles under a parent session.
