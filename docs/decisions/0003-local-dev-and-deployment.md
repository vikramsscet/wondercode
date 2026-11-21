# ADR 0003: Local development and independent deployment

Status: Accepted

## Decision
- Web on `localhost:5173`, API on `localhost:3000`.
- Supabase hosted PostgreSQL and Storage; no Docker/local Supabase.
- Frontend and backend URLs come from environment variables (`VITE_API_BASE_URL`, `VITE_APP_URL`, API `CORS_ORIGINS`).
- No production hosting or domain yet. Web and API stay independently deployable and share no runtime coupling.
