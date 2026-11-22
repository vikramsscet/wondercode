# ADR 0014: Rule-based prompt safety and understanding

Status: accepted (Prompt 15)

## Context
Children's prompts must be validated, moderated and understood before any planning or code generation (FR-03, section 9.3). Only the mock AI provider exists (ADR 0002), and it cannot judge real content.

## Decision
- A deterministic module, `apps/api/src/modules/prompts/`, with no AI call and no code generation.
- Pipeline: clean (strip control and zero-width characters, collapse spaces) -> length and letters check -> moderation -> understanding (project type, language, missing details).
- Moderation is rule-based (English, Hindi, Hinglish) over whole words, with leetspeak and punctuation-evasion normalisation. Categories: violence, sexual, self_harm, hate, drugs, personal_data, malware, injection.
- `moderateWithHook` accepts an optional async hook so a real moderation model can be added later without changing callers.
- Blocked replies are calm, age-appropriate, in the child's language, and never repeat the child's words.
- Prompt text is never stored. Usage events hold only `prompt.blocked` + category, or `prompt.analyzed` + projectType/ready.
- Guests and children share one endpoint, `POST /api/v1/prompts/analyze`. Guest token and parent JWT stay separate (X-Guest-Token vs Authorization + X-Child-Id).

## Consequences
- Word lists will miss novel phrasing and may over-block; they need review with educators and a real moderation model before launch (Prompt 38).
- Per-user rate limits for this endpoint arrive with Prompt 37.
