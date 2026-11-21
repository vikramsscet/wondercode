# Supabase Setup (development)

WonderCode uses a **hosted** Supabase project per environment (ADR 0005). Only `wondercode-dev` is configured. There is no local Docker Supabase.

## 1. Configure credentials

```
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Fill in values from the dashboard: **Project Settings → API**.

| Variable | File | Notes |
|---|---|---|
| `SUPABASE_URL` | `apps/api/.env` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `apps/api/.env` | Secret. Server only. Bypasses RLS |
| `VITE_SUPABASE_URL` | `apps/web/.env` | Same project URL |
| `VITE_SUPABASE_ANON_KEY` | `apps/web/.env` | Public anon/publishable key only |

Never put the service-role key in `apps/web` or in any `VITE_*` variable. `.env` files are git-ignored.

## 2. Verify the connection

```
npm run check:supabase -w apps/api
```

Prints `OK: connected to Supabase (<host>)` or a failure reason (`invalid_key`, `unreachable`, `request_failed`). It never prints keys. The API starts without Supabase configured; the Supabase client is created only where needed.

## 3. Applying migrations to the hosted dev project

Migration files live in `supabase/migrations/` (first ones arrive in Prompt 06). Never run against production without explicit approval.

**Option A: Supabase CLI** (needs the CLI, but not Docker):
```
npx supabase login
npx supabase link --project-ref <wondercode-dev-ref>
npx supabase db push
```
Check the linked project ref is the dev one before pushing.

**Option B: Dashboard.** Open **SQL Editor**, paste each migration file in filename order, and run it. Seed data (`supabase/seed.sql`, from Prompt 06) is applied the same way.

## Security notes
- The backend verifies the user's JWT and checks ownership in its services; the service-role client bypasses RLS, so authorization must never be skipped.
- RLS is enabled on all exposed tables as defence in depth (Prompt 06).
