# Project planning (Prompt 16)

`POST /api/v1/prompts/plan`
Auth: `X-Guest-Token`, or `Authorization: Bearer <jwt>` + `X-Child-Id`.
Body: `{ "prompt": string, "language"?: "en"|"hi"|"hinglish", "answers"?: string[≤2] }` (strict).

Flow: merge `answers` into the prompt -> analyse (Prompt 15: clean, moderate, understand) -> if not `ok`, return that result with `plan: null` -> `AIService.generateProjectPlan` -> plan policy check -> return.

Response `data`: everything from `/analyze`, plus `plan` (or `null`) and `isMock`.

Plan fields: `title`, `description`, `projectType`, `features`, `interaction` (how the child uses it), `expectedBehaviour`, `files`, `learningConcepts`, `childSummary` and the localized items, all in `en`, `hi` and `hinglish`.

Policy applied to every provider's plan (`enforcePlanPolicy`): files only `index.html`, `style.css`, `script.js` and must include `index.html`; no URLs; all text passes moderation. A violation returns a generic `502 AI_INVALID_RESPONSE`.

Personalisation: children's `age` and `interests` (fixed tags) are passed to the provider; guests get none.

The plan is not saved here. Prompt 18 saves it with the first project version, and the child reviews it in Prompt 17.
