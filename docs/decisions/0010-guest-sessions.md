# ADR 0010: Guest trial sessions

Status: Accepted

## Decision
- Guests get a random 256-bit token (returned once, sent as `X-Guest-Token`); the database keeps only its SHA-256 hash. The header is separate from `Authorization: Bearer`, which stays for parent JWTs, so neither credential type can be mistaken for the other.
- Sessions expire after 120 minutes (configurable), are limited to 2 projects and 10 AI uses, and creation is rate limited per IP (`express-rate-limit`).
- Guest-owned data is isolated by the schema (a project belongs to a child or a guest) and by guards: guest routes use `requireGuest`; parent and child routes use `requireAuth`.
- Expired sessions are purged by a scheduled script; deleting a session cascades to its projects and usage.

## Consequences
Rate limiting is per IP and in memory (per process), which is enough for development; a shared store is needed if the API runs on several instances. Guest Storage objects need explicit cleanup once project saving exists.
