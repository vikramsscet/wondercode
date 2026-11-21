# ADR 0007: API contract and code standards

Status: Accepted

## Decision
- Response and error envelopes, error code table, `/api/v1` versioning, naming and pagination rules are defined in `docs/api/conventions.md`.
- Request validation uses zod via a `validate()` middleware; handlers use `req.validated`.
- ESLint (flat config, `eslint-config-prettier`, `react-hooks`) and Prettier, run from the repo root (`npm run lint`, `npm run format`).
- API documentation is hand-written Markdown (`docs/api/endpoints.md`). OpenAPI/Swagger is deferred until the API surface justifies the tooling.

## Consequences
Consistent contracts for the frontend. zod schemas can later be reused for AI-output validation. Docs rely on discipline rather than generation.
