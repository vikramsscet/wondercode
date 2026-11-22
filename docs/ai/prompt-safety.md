# Prompt safety and understanding (Prompt 15)

`POST /api/v1/prompts/analyze`
Auth: `X-Guest-Token`, or `Authorization: Bearer <jwt>` + `X-Child-Id`.
Body: `{ "prompt": string, "language"?: "en" | "hi" | "hinglish" }` (strict; extra fields rejected).

Response `data`:
| field | meaning |
|---|---|
| `status` | `ok`, `needs_clarification` or `blocked` |
| `projectType` | `game`, `quiz`, `calculator`, `animation`, `webpage` or `null` |
| `language` | detected: `en`, `hi`, `hinglish` |
| `questions` | up to 2 `{ text, suggestions[] }`, in `language` (or the requested one) |
| `message` | child-friendly text for `blocked` or too-short prompts, else `null` |
| `category` | only when blocked |

Rules: prompts are 3 to 500 characters after cleaning and need at least one letter. Blocked prompts are never echoed or stored; only the category is logged as a usage event. Code generation is not part of this endpoint.

Extending: add words in `prompts.moderation.js` / `prompts.understanding.js`, or pass a `moderationHook` for a real moderation model.
