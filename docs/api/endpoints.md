# Endpoints

Base path `/api/v1`. See [conventions](conventions.md).

## GET /health
Auth: none. Liveness check.

Response `data`: `{ "status": "ok", "uptimeSeconds": 12 }`

## GET /auth/me
Auth: parent bearer token (`Authorization: Bearer <Supabase access token>`).

Returns the authenticated parent. Sign-up, sign-in and sign-out are done by the web app directly with Supabase Auth; the API only verifies the token.

Response `data`: `{ "id": "uuid", "email": "p@example.com", "displayName": "Pat", "uiLanguage": "en", "createdAt": "ISO date" }`

Errors: `401 UNAUTHENTICATED` (missing, malformed, expired or invalid token), `503 SERVICE_UNAVAILABLE` (Supabase Auth unreachable or not configured).

## Children (parent-managed profiles)
All endpoints require a parent bearer token. Every query is scoped to the authenticated parent; a child that does not exist, is deleted, or belongs to another parent returns `404 NOT_FOUND`.

Child object: `{ id, displayName, age, avatarKey, explanationLanguage, interests, createdAt, updatedAt }`. `parent_id` is never returned.

Field rules: `displayName` 1-30 chars; `age` integer 8-12; `avatarKey` from the shared list; `explanationLanguage` `en|hi|hinglish` (default `en`); `interests` up to 5 unique tags from the shared list (default `[]`). Unknown fields are rejected. Allowed values live in `packages/shared`.

| Method and path | Purpose | Success |
|---|---|---|
| `GET /children` | List the parent's children (oldest first) | 200, array |
| `POST /children` | Create a child. Body: `displayName`, `age`, `avatarKey`, optional `explanationLanguage`, `interests` | 201, child |
| `GET /children/:childId` | Get one child | 200, child |
| `PATCH /children/:childId` | Update any of the fields above (at least one) | 200, child |
| `DELETE /children/:childId` | Soft delete (sets `deleted_at`; a later purge removes data) | 200, `{ id, deleted: true }` |

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 NOT_FOUND`, `409 CHILD_LIMIT_REACHED` (max 5 children).

### Active child on later endpoints
Child-scoped endpoints (projects, progress, AI) must use `requireOwnedChild`. It reads `:childId` or the `X-Child-Id` header, verifies the child belongs to the authenticated parent and sets `req.child`. The frontend's choice of active child is never trusted by itself.

## Guest sessions
Guests try WonderCode without an account. A guest has no access to parent or child data: guest tokens are accepted only by guest routes (`X-Guest-Token` header), and parent routes accept only Supabase JWTs.

| Method and path | Auth | Purpose |
|---|---|---|
| `POST /auth/guest-session` | none (rate limited per IP) | Start a session. 201 `{ token, id, expiresAt, limits: { maxProjects, usageLimit } }`. The token is shown **once**; only its SHA-256 hash is stored. |
| `GET /auth/guest-session` | `X-Guest-Token` | Session status (no token in the response) |
| `DELETE /auth/guest-session` | `X-Guest-Token` | End the session now |

Errors: `401 UNAUTHENTICATED` (missing, malformed or unknown token), `401 GUEST_SESSION_EXPIRED`, `429 RATE_LIMITED`, `503 SERVICE_UNAVAILABLE`, and `409 GUEST_LIMIT_REACHED` when a guest project is created over quota (enforced by `assertGuestProjectQuota`, used by the project endpoints in a later prompt).

Settings (`apps/api/.env`, defaults): `GUEST_TTL_MINUTES=120`, `GUEST_MAX_PROJECTS=2`, `GUEST_USAGE_LIMIT=10`, `GUEST_SESSIONS_PER_IP_PER_HOUR=10`.

### Cleanup
`npm run purge:guests -w apps/api` deletes expired sessions; their projects, versions and usage rows cascade. Schedule it (for example hourly) once deployed. **Storage files of guest projects are not removed by the cascade**, so the purge must also delete those objects when project saving exists (Prompt 32). Behind a proxy, set Express `trust proxy` so the rate limit sees real client IPs.
