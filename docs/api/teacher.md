# AI teacher API (Prompt 26, interim)

`POST /api/v1/teacher/ask`: one question in, one answer out. Children (parent JWT + `X-Child-Id`) and guests (`X-Guest-Token`).

**Interim:** no project context, no files, no tools and no stored conversation. Prompt 27 adds the authorised project context, selected lines, age-appropriate rules, usage limits and stored conversations.

## Request (strict)
```json
{ "question": "What is a variable?", "explanationLanguage": "en" }
```
`explanationLanguage` is `en`, `hi` or `hinglish` (default `en`). Any other field (for example `context`, `tools`, `filePath`) is a 400.

## Behaviour
1. The question is cleaned (control and zero-width characters removed). Fewer than 3 characters, no letters, or more than 500 characters gives `status: "invalid"` with a short localized "ask me a little more" message. No AI call.
2. The question goes through the Prompt 15 moderation rules (English, Hindi, Hinglish, leetspeak). A blocked question gives `status: "blocked"` with a calm localized message and no AI call. Only the category is recorded as a `teacher.blocked` usage event. The question is never stored, logged or echoed.
3. Otherwise `AIService.answerTeacherQuestion` is called (timeout, retry and metering as in Prompt 14). The answer and every follow-up must be free of links and HTML and pass moderation, otherwise a generic `502 AI_INVALID_RESPONSE` is returned and nothing is shown.

## Response `data`
```json
{ "status": "ok", "answer": "…", "language": "en", "followUps": ["…"], "isMock": true }
```
Other statuses: `{ "status": "blocked" | "invalid", "message": "…", "followUps": [] }` (HTTP 200).

## Not included yet
Context, age rules, per-child limits, conversations and messages tables (Prompt 27); diagrams (Prompt 28).
