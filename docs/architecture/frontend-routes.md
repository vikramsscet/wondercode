# Frontend routes and access areas

Parent, guest and (later) child experiences are kept separate. Each has its own guard and credential.

| Route | Area | Guard | Credential |
|---|---|---|---|
| `/` | Public landing: hero, guest entry, parent entry, how it works | none | none |
| `/sign-in`, `/sign-up` | Parent authentication | none (redirects signed-in parents) | Supabase email + password |
| `/parent` | Parent dashboard: Overview (`/parent`), Children, Projects, Progress, Usage, Privacy (`/parent/<tab>`) | `ProtectedRoute` | Supabase session (`Authorization: Bearer`) |
| `/profiles` | Profile picker ("Who's learning today?"), add a child | `ProtectedRoute` | Supabase session |
| `/dashboard` | Child dashboard (own layout, no parent controls) | `ChildRoute` | Supabase session + an active child owned by that parent |
| `/try` | Guest area (placeholder) | `GuestRoute` | Guest token (`X-Guest-Token`), kept in `sessionStorage` |
| `/design` | Style guide | development builds only | none |
| `*` | Not found | none | none |

Rules:
- A guest request never sends the parent token, and a parent request never sends the guest token (`apiRequest` picks one).
- The guest token lives in `sessionStorage` (per tab, cleared when the tab closes), never in cookies or `localStorage`. Storage errors are ignored, so a blocked storage just means no restore on refresh.
- Guest sessions that run out are cleared automatically and the visitor returns to `/`.
- After parent sign-in the app goes to `/profiles`. Choosing a child stores its id in `sessionStorage` and opens `/dashboard`. The stored id is only a hint: `ChildProfilesProvider` accepts it only if it is in the signed-in parent's child list from the API, so a stale or foreign id is ignored. Signing out clears it.
- Child routes use `ChildLayout`, whose header shows the active child's avatar and name and a "Switch profile" button. It has no parent link, account menu or sign-out. Switching goes to `/profiles` without signing out.
- Future child-scoped routes (workspace, etc.) go under `ChildRoute`. Parent-only screens must never be nested under a child route.
- **Known gap:** "Switch profile" leads to `/profiles`, which is a parent-level page with a Parent area link and Sign out. Until the parent PIN / re-authentication prompt (deferred, ADR 0004) exists, a child can reach the parent area from there.
- Dashboard projects, journey, challenges and starter ideas are temporary sample data from `features/dashboard/mockData.js`, shown with a "Preview" badge. Each one names the prompt that replaces it.

Landing copy is written for parents and children and should be reviewed (and localised) before a public launch.

## Parent dashboard (Prompt 13)
- Overview (account from `/auth/me`, child count) and Children (add, edit, delete with confirmation) use real APIs.
- Projects, Progress and Usage are shells with "Coming soon" panels. They deliberately show no sample numbers; they are connected to real data in Prompt 36 once their APIs exist.
- Privacy lists exactly what is stored about each child today (nickname, age, avatar, explanation language) and marks consent, export and full deletion controls as coming soon.
- Deleting a child is a soft delete today; the purge job that permanently removes the data (and Storage files) is not built yet.
