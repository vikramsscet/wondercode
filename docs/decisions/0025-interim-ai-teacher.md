# 0025: Interim AI teacher endpoint

Status: accepted (Prompt 26)

## Decision
- Prompt 26 needs a working chat, but the context-aware teacher is Prompt 27. A minimal stateless `POST /teacher/ask` (question and language only) is added so the UI can be built and tested end to end.
- It reuses the existing layers: owner middleware, Prompt 15 moderation, `AIService` metering, and the explanation text policy (no links, no HTML, moderation) for answers and follow-ups.
- Conversations are in memory in the browser. No tables yet.
- No code, files or tools are accepted (the body schema is strict).

## Consequences
- Prompt 27 will replace the internals (context, age rules, limits, persistence); the route and the UI stay.
- Per-child rate limits wait for Prompt 37; AI calls are metered meanwhile.
