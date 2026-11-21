# ADR 0005: Separate Supabase projects per environment

Status: Accepted

## Decision
- `wondercode-dev` for development and testing; `wondercode-prod` in future. Only dev is configured now.
- Credentials via environment variables; never committed; service-role key never in frontend code.
- Migrations in `supabase/migrations`, seed in `supabase/seed.sql`. Without Docker, they are applied to the hosted dev project via Supabase CLI (`supabase link` + `supabase db push`) or by pasting SQL in the dashboard SQL editor. Never run against production without explicit approval.
