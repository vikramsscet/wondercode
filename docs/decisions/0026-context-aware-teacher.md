# 0026: Context-aware AI teacher, limits and retention

Status: accepted (Prompt 27)

## Decision
- The server builds the teacher's context from the caller's own saved project and the selected saved lines (hash-checked). The browser sends only ids and line numbers, so it cannot inject code or widen what the AI sees.
- Age rules: the provider gets the child's age (children only), teaching rules and a length limit, and the server enforces the length itself (400 characters for ages 8-9 and guests, 700 for 10-12), trimming at a sentence end. Question and answer both pass moderation; answers also must have no links or HTML.
- Usage limits: a rolling 24-hour count of answered questions from `usage_events` (50 for children, 10 for guests, configurable), checked before the AI call. Blocked and invalid questions do not count.
- Conversations are stored (`teacher_conversations`, `teacher_messages`), but only allowed questions and answers, for 30 days by default (`TEACHER_RETENTION_DAYS`), with a purge script and a "Clear chat" control. The AI sees only the last 6 messages.
- RLS is on with no policies: only the API reads chats. Parents cannot read chats yet.
- `projectId` is now required on `POST /teacher/ask`; the stateless interim version from Prompt 26 is gone.

## Consequences
- Migration `20261122000008` must be applied by hand. The purge script must be scheduled.
- A count-then-call limit check can be exceeded by a few parallel requests; real rate limiting arrives in Prompt 37.
- Whether parents may see chats, and the 30-day retention, belong in the privacy review (Prompt 38).
