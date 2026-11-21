# ADR 0012: Active child and the child learning area

Status: Accepted

## Decision
- The parent signs in once; a profile picker chooses the active child; switching never signs out.
- The active child is held in the web app (`sessionStorage`, per tab) only as a hint and is accepted only if it appears in the parent's child list returned by the API. Authorization stays on the backend (`requireOwnedChild`, ADR 0004/0008).
- The child area has its own layout and route guard and contains no parent-only controls.
- Avatars are frontend artwork keyed by the shared `AVATAR_KEYS` (emoji placeholders for now).
- Dashboard sections without APIs use labelled temporary sample data.

## Consequences
Child-scoped API calls will send the active child id (the `X-Child-Id` header) when those endpoints exist. Until a parent PIN is added, the picker page is reachable by a child and exposes the parent area link.
