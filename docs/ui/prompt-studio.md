# Prompt Studio (Prompt 17)

Routes: `/create` (child, inside the child layout) and `/try/create` (guest). Both render `features/prompt-studio/PromptStudio.jsx`.

Flow (`usePromptStudio`): `writing` -> `thinking` -> `clarifying` | `blocked` | `reviewing` | `error`.
- Calls `POST /prompts/plan` (see `docs/ai/project-planning.md`). Children send `Authorization` + `X-Child-Id`; guests send only `X-Guest-Token`.
- Clarifying answers are sent in `answers` (max 2 rounds; after that the child is asked to add detail to the idea).
- Blocked: shows the API's calm message; the child's text is never echoed back.
- Review: title, description, summary (English / हिन्दी / Hinglish switcher), features, how to use, what will happen, concepts and files. "Sample plan" badge when the provider is the mock.
- "Looks good!" only shows a "not ready yet" note. Generation arrives in Prompt 18.

Privacy: the prompt lives in component state only. Nothing is written to browser storage.
Accessibility: labelled controls, focus moves to each step's heading, `role=status`/`alert` for progress and errors, 44px minimum targets.
Entry points: dashboard "Start this idea" cards (pre-fill the prompt via router state) and "Create something new"; guest home "Start creating".

## Saving (Prompt 18)
"Looks good!" calls `POST /projects/generate` with the plan, prompt and language, shows "Building your project…", then "Your project is saved!" with the file names (and a "Sample code" badge for the mock). Opening the project is Prompt 20, so the screen says so. Save errors (limits, network) show a friendly message and "Try again" repeats the save, not the plan.
