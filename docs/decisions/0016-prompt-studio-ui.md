# ADR 0016: Prompt Studio UI

Status: accepted (Prompt 17)

- One shared `PromptStudio` component, two routes (`/create` for children, `/try/create` for guests), so each area keeps its own guard and layout (no parent controls in the child area).
- State is a small step machine in `usePromptStudio`; stale replies are ignored. The prompt is held in memory only.
- `apiRequest` gained an optional `childId` that sends `X-Child-Id`; the API still verifies ownership.
- "Looks good!" is an honest placeholder until Prompt 18; nothing pretends to build.
- UI chrome is English only for now; plan content follows the child's chosen language. Full UI localisation is still to do.
