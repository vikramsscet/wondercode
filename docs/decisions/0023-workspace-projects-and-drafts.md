# 0023: Opening saved projects and local draft recovery

Status: accepted (Prompt 24)

## Decision
- The workspace opens saved projects at `/workspace/:projectId` (child) and `/try/workspace/:projectId` (guest) using the existing `GET /projects/:id`. No API change.
- There is no server-side save of edited code yet; new versions come with Experiment Mode (Prompt 29). Until then edits are protected by a local draft.
- Drafts live in `localStorage` (survives closing the browser), keyed by owner, project and version, capped, expiring after 14 days, validated on load, and only ever offered through an explicit Restore / Throw away choice.
- The preview runs the editor's current text (a snapshot at Run), so displayed source and previewed source cannot differ; a hint shows when code changed after a run.

## Consequences
- On a shared device, drafts could be seen by someone using the same browser profile. `sessionStorage` would avoid that but loses edits when the tab closes. Revisit with the security and privacy review (Prompt 38).
- There is still no "My projects" list; projects are opened from Prompt Studio's saved step.
