# AI teacher API (Prompts 26 and 27)

Context-aware, age-appropriate teacher for a saved project. Children (parent JWT + `X-Child-Id`) and guests (`X-Guest-Token`). Envelope as usual. Apply migrations `20261122000008_teacher_conversations.sql` and `20261122000009_teacher_message_visuals.sql` first.

## POST `/api/v1/teacher/ask`
```json
{ "projectId": "uuid", "versionId": "uuid?", "conversationId": "uuid?",
  "question": "What does this do?", "explanationLanguage": "en",
  "selection": { "filePath": "script.js", "lineStart": 2, "lineEnd": 3 } }
```
Strict body. `projectId` is required; `versionId` defaults to the current version; `selection` is optional. **The browser never sends code, context or tools**; extra fields are a 400.

### What the server does, in order
1. **Clean and moderate the question** (Prompt 15 rules, English/Hindi/Hinglish, leetspeak). Too short, no letters or over 500 characters gives `status: "invalid"`; unsafe gives `status: "blocked"` with a calm localized message. Neither calls the AI, uses up the daily limit, or is stored. Only the category of a blocked question is recorded (`teacher.blocked`).
2. **Build the context itself** from the caller's own project: title, type, learning concepts of the version, and, if `selection` is given, the **saved** lines of that file (hash-checked against the manifest; at most 40 lines and 2,000 characters), plus the concept of a saved explanation for the same lines if there is one. Nothing else is shared: no other files, projects or children. Unknown or foreign project, version or file: 404.
3. **Pick the conversation:** `conversationId` (must be this owner's and this project's, else 404), otherwise the latest for the project, otherwise a new one.
4. **Usage limit:** answered questions in the last 24 hours (from `usage_events`) must be below `TEACHER_DAILY_LIMIT_CHILD` (default 50) or `TEACHER_DAILY_LIMIT_GUEST` (default 10), else `429 TEACHER_LIMIT_REACHED` ("Come back tomorrow") before any AI call. A chat holds at most 100 live messages, else `409 TEACHER_CONVERSATION_FULL`.
5. **Call the AI** (`AIService`, timeout/retry/metering) with: question, language, the child's age (children only), `maxAnswerChars` (400 for ages 8-9 and guests, 700 for 10-12), the teaching `rules` (short sentences, keywords unchanged, simple comparison, encourage thinking, stay on learning, no personal details, no links), the context, and up to the last 6 messages (each trimmed to 300 characters).
6. **Check the answer:** the answer and follow-ups must have no links or HTML and pass moderation, else a generic `502 AI_INVALID_RESPONSE`. The answer is trimmed to the age limit at a sentence end.
7. **Store** the allowed question and the answer (2 messages) with `expires_at = now + TEACHER_RETENTION_DAYS` (default 30).

### Response `data`
```json
{ "status": "ok", "conversationId": "uuid", "answer": "…", "language": "en",
  "followUps": ["…"], "visual": { … }, "isMock": true, "remainingToday": 49 }
```
`visual` is optional (see [visual explanations](../ai/visual-explanations.md)); it is stored with the message and returned by the GET below.

or `{ "status": "blocked" | "invalid", "message": "…", "followUps": [] }` (HTTP 200).

## GET `/api/v1/teacher/conversations?projectId=`
The latest chat for the project: `{ conversationId, messages: [{ role: "child"|"teacher", text, isMock, visual?, createdAt }] }`, or `{ conversationId: null, messages: [] }`. Expired messages are not returned. Unknown or foreign project: 404.

## DELETE `/api/v1/teacher/conversations/:conversationId`
"Clear chat": removes the owner's conversation and its messages. Another owner's id is a 404.

## Retention and privacy
- Only allowed questions and answers are stored, for `TEACHER_RETENTION_DAYS` (default 30). The API ignores expired messages. `npm run purge:teacher -w apps/api` deletes expired messages and chats idle longer than the retention; schedule it.
- Chats are deleted with the child, guest session or project (cascade).
- Tables have RLS on and **no policies**: only the API (service role) reads them, after checking ownership. Parent access to chats is a separate product decision.
- Questions, answers and code are never logged. `usage_events` metadata holds no text.

## Environment
`TEACHER_DAILY_LIMIT_CHILD`, `TEACHER_DAILY_LIMIT_GUEST`, `TEACHER_RETENTION_DAYS` (all optional, defaults above).

## Not included
Per-minute rate limits and abuse protection (Prompt 37), parent view of chats.
