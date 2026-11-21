# ADR 0002: Mock AI provider first, provider-independent architecture

Status: Accepted

## Decision
- No paid AI APIs and no AI keys during initial development.
- A common `AIProvider` interface covers planning, code generation, code explanation, refinement and AI Teacher answers.
- `MockAIProvider` returns deterministic sample responses. Selected via `AI_PROVIDER` (default `mock`).
- Every AI response carries `meta: { provider, isMock }`; the UI must show mock responses as sample responses.
- OpenAI, Gemini and Claude adapters are added later by implementing the interface and registering them, without changing core services.

## Scheduled
Implemented in Prompt 14 (not before).
