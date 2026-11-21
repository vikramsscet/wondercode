# WonderCode Architecture

Summary of the architecture. Requirements, schema and API detail live in the
[blueprint](../../WonderCode_Product_and_Technical_Blueprint_README.md).

## Principles

- Modular monolith, not microservices. Modules are separated so they can be extracted later.
- All AI-generated and child-edited code is untrusted. It runs only in a sandboxed browser preview, never in the Express process or the main app context.
- Secrets (AI keys, Supabase service-role key) exist only on the backend.
- Authorization (parent, child, guest, project ownership) is enforced on the backend for every request. RLS is defence in depth.
- Child safety and data minimisation are design constraints, not later add-ons.

## Components

| Component | Tech | Responsibility |
|---|---|---|
| frontend | React, Vite, JS, Tailwind, Monaco | UI, workspace, preview host, localisation |
| backend | Node.js, Express, JS | API `/api/v1`, auth verification, AI orchestration, validation, persistence |
| database | Supabase PostgreSQL + Auth | Metadata, profiles, learning data, RLS |
| storage | Supabase Storage (private buckets) | Project file contents, accessed via backend |
| AI | Provider adapters | Planning, generation, explanations, teacher, debugging |

## Frontend

Feature-sliced: `src/features/<feature>/` (onboarding, auth, prompt-studio, workspace, code-explorer, live-preview, ai-teacher, learning-journey, challenges, parent-dashboard) plus shared `components`, `services`, `hooks`, `contexts`, `localization`, `utils`, `styles`.

- Routing: React Router. Server state: TanStack Query. Session and language: React Context.
- Monaco is lazy-loaded.
- Preview: `<iframe sandbox="allow-scripts">` (no `allow-same-origin`), strict CSP, validated `postMessage` (check `event.source` and message schema). A separate preview origin is a later hardening step.
- UI language and explanation language (`en`, `hi`, `hinglish`) are independent settings.
- Frontend holds only the Supabase anon key.

## Backend

Layering: route → controller → service → repository, grouped per domain module under `src/modules/<name>/`. Route handlers never call provider SDKs or the database directly.

- `app.js` (builds the app, testable) is separate from `server.js` (listens).
- Zod for request and AI-output validation; helmet, CORS allowlist, rate limits, request-size limits, pino logs with request IDs, central error handler.
- Response envelope: `{ success, data, meta: { requestId } }` / `{ success: false, error: { code, message, details }, meta }`.
- Two auth guards: Supabase JWT (parents/children) and hashed guest-session token.

## Database

- Backend uses supabase-js with the service-role key; verifies the JWT, then authorizes in the service layer.
- Migrations live in `supabase/migrations/` (Supabase CLI). Schema is created in Prompt 06, not before.
- Project versions are immutable. File contents go to Storage; manifest and hashes go to Postgres.
- Multi-row writes (e.g. create version) use SQL functions/RPC for transactions.
- Guest data has `expires_at` plus scheduled cleanup.

## AI integration

- `AIProvider` interface: `generateProjectPlan`, `generateProjectCode`, `explainCode`, `answerTeacherQuestion`, `suggestCodeFix`.
- Registry/factory selects the adapter from `AI_PROVIDER` / `AI_MODEL`. Adapters isolate SDK specifics and normalise structured output.
- Wrapper adds timeouts, bounded retries, Zod validation, moderation (before and after), and usage metering into `usage_events`.
- Prompt templates are versioned files, separate from adapters.
- A mock provider is used in tests so no keys are needed.
- Prompts and generated code are treated as data, never as instructions.

## Generation flow

Prompt → moderation → plan → child approves → generate → schema + code validation → save immutable version → load into preview. Preview execution result, not the model's claim, decides success.

## Out of scope for the MVP

Server-side code execution, Python/C/C++, public sharing, leaderboards, voice, mobile app, school admin.
