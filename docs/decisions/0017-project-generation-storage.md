# ADR 0017: Project generation and storage

Status: accepted (Prompt 18)

- The browser sends the approved plan back; the server never trusts it (re-validate, re-apply plan policy, re-moderate the prompt).
- Provider output is held to `generation.policy.js` before anything is saved, so swapping providers cannot weaken it.
- Files go to the private `project-files` bucket at `<child|guest>/<owner id>/<project id>/v<n>/<file>`; the DB keeps an immutable manifest (hash, size, key).
- supabase-js has no multi-table transaction. The save is ordered (files, project, version, file rows, current version) with best-effort cleanup on failure. Orphans are possible only if cleanup itself fails; a periodic orphan sweep belongs with the purge job. A Postgres function could make this atomic later (needs a migration).
- Reads verify sha-256 against the manifest.
- Responses say `validated: false` until Prompt 19.
- `requireOwner` middleware now shares the child-or-guest identification used by `/prompts/*` and `/projects/*`.
