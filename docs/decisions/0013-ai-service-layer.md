# ADR 0013: AI service layer

Status: Accepted

## Decision
- All AI use goes through `AIService`, which depends only on the `AIProvider` interface. It owns input and output validation (zod), timeouts, bounded retries, error mapping, usage metering and the `isMock` label.
- Usage is recorded in `usage_events` per call, with counts only (no content), for either a child or a guest.
- The provider is created once at startup from `AI_PROVIDER` through a registry. Unimplemented provider names fail at startup.
- Output schemas check shape and basic limits; content safety and code validation are separate later layers.

## Consequences
Real providers are adapters plus one registry line. Retries multiply cost and latency, so they are bounded. Usage rows are per call, so quota logic (Prompt 37) can sum them.
