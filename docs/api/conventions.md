# API Conventions

Applies to every endpoint in `apps/api`. Implemented by `src/utils/response.js`, `src/utils/AppError.js`, `src/middleware/validate.js` and `src/utils/pagination.js`.

## Versioning
- All routes live under `/api/v1`. Breaking changes require a new prefix (`/api/v2`); additive changes (new optional fields, new endpoints) do not.
- Routers are registered in `src/routes/index.js`.

## Naming
- URLs: plural nouns, kebab-case, e.g. `/children/:childId/projects`. Actions that are not CRUD are sub-resources with `POST`, e.g. `/projects/:id/versions/:versionId/restore`.
- JSON fields: `camelCase`. Database columns: `snake_case`; repositories map between them.
- IDs are UUIDs. Dates are ISO 8601 UTC strings.
- Methods: `GET` read, `POST` create/action, `PATCH` partial update, `DELETE` remove. `201` for creates, `204` is not used (always return the envelope).

## Success envelope
```json
{ "success": true, "data": {}, "meta": { "requestId": "..." } }
```
Use `sendSuccess(req, res, data, { status, meta })`.

## Error envelope
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "The request could not be processed.", "details": [] },
  "meta": { "requestId": "..." }
}
```
Throw `new AppError(status, code, message, details)` from services; the central handler formats it. Unknown errors become `500 INTERNAL_ERROR` with a generic message. Never include stack traces, provider errors, SQL, secrets or child data in messages.

### Error codes
| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Params, query or body failed validation; `details` lists `{ in, field, message }` |
| `INVALID_JSON` | 400 | Malformed JSON body |
| `UNAUTHENTICATED` | 401 | Missing or invalid credentials (from Prompt 07) |
| `GUEST_SESSION_EXPIRED` | 401 | Guest session lifetime ended; start a new one |
| `GUEST_LIMIT_REACHED` | 409 | Guest quota (projects) reached |
| `FORBIDDEN` | 403 | Authenticated but not allowed, including a child not owned by the parent |
| `CORS_FORBIDDEN` | 403 | Origin not allow-listed |
| `NOT_FOUND` | 404 | Unknown route or resource (also used instead of 403 when revealing existence would leak data) |
| `CONFLICT` | 409 | State conflict, e.g. duplicate |
| `CHILD_LIMIT_REACHED` | 409 | Parent already has the maximum number of child profiles (5) |
| `PAYLOAD_TOO_LARGE` | 413 | Body over the limit (100 KB default) |
| `RATE_LIMITED` | 429 | Quota or rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | A dependency (e.g. Supabase Auth) is unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected failure |

New codes are `UPPER_SNAKE_CASE`, added to this table when introduced.

## Request validation
- Every route that accepts input uses `validate({ params, query, body })` with zod schemas, placed before the controller.
- Handlers read `req.validated.*`, never raw `req.body/query/params`.
- Body schemas use `.strict()` so unknown fields are rejected; trim and bound all strings.
- Validate in routes; authorization (ownership) happens in services.

## Pagination
List endpoints use `?page=1&pageSize=20` (max 50) via `paginationQuery`, `toRange` and `paginationMeta`. Return `meta: { page, pageSize, total, totalPages }`.

## Documentation of endpoints
Each endpoint is documented in `docs/api/endpoints.md` in the same prompt that adds it: method and path, auth required, request schema, response `data`, error codes, example. Keep it in sync; a prompt is not done until its endpoints are documented.
