# ADR 0009: Parent authentication

Status: Accepted

## Decision
- Parents register, sign in and sign out with Supabase Auth directly from the web app (anon key, email + password). Children have no credentials.
- The API verifies every protected request by calling Supabase `auth.getUser(token)` (not by trusting the JWT locally), so revoked or expired sessions are rejected. `requireAuth` sets `req.auth`.
- The web app keeps the session via supabase-js (browser storage) and sends the access token as a bearer token. Parent-only routes sit behind `ProtectedRoute`; child-facing routes (Prompt 08+) must use a separate child guard.
- A database trigger creates `parent_profiles` on sign-up.

## Consequences
One extra network call to Supabase per protected request (acceptable for the MVP; local JWT verification can replace it later). Email confirmation behaviour is controlled in the Supabase dashboard.
