# ADR 0006: Monorepo layout (supersedes layout in ADR 0001)

Status: Accepted

## Decision
npm workspaces:
```
apps/web          React + Vite frontend
apps/api          Express backend (Prompt 03)
packages/shared   Created only when code is actually shared
supabase/         migrations, seed.sql
docs/architecture, docs/decisions
```
Apps remain independently deployable. No extra packages until needed.

## Note
Test DOM is happy-dom because jsdom requires Node >= 22.12 and the local Node is 22.11.
