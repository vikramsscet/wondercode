# 0024: Versioned code explanations

Status: accepted (Prompt 25)

## Decision
- Explanations are generated only for **saved** code. The browser sends version, file, lines and the SHA-256 of the selected lines; the server reads the saved file itself, verifies the manifest hash and recomputes the lines' hash. A mismatch is `409 EXPLANATION_STALE`.
- The server, not the provider, decides the stored binding (file, lines, hash).
- Rows are immutable and unique per (version, file, lines, hash, language), so repeats are served from the cache and the AI is called once.
- A new version makes older explanations `stale` (computed on read).
- Provider text passes an explanation policy (no links, no HTML, moderation) before it is stored or shown.
- The route is `/projects/:projectId/explanations`, consistent with the other project routes, instead of the blueprint's `/ai/projects/...`.
- UI: an "Explain my code" panel in the workspace using the selected lines. Edited files are blocked until reset, because unsaved code has no saved version to bind to.

## Consequences
- Needs migration `20261122000007` applied by hand.
- Per-user rate limits wait for Prompt 37; the cache bounds repeated calls meanwhile.
- The mock provider picks concepts by simple keyword matching; real quality depends on the real provider.
