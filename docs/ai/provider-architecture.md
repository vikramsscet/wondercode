# AI Provider Architecture

Decision record: [ADR 0002](../decisions/0002-mock-ai-provider.md), [ADR 0013](../decisions/0013-ai-service-layer.md).

```
feature code (routes/services, later prompts)
        |  app.locals.ai   (AIService)
        v
AIService  modules/ai/ai.service.js
   validate input (zod) -> call provider with timeout -> retry (bounded) -> validate output (zod)
   -> record usage -> return { data, meta: { provider, model, isMock } }
        |
        v
AIProvider interface  providers/ai/AIProvider.js
        |
        +-- MockAIProvider   (default, no key, deterministic)
        +-- OpenAI / Gemini / Anthropic adapters  (not built yet)
```

## Rules
- Feature code only calls `AIService`. It never imports a provider or an SDK.
- A provider returns `{ data, usage: { inputTokens, outputTokens }, model }`, and `data` must match the output schema in `modules/ai/ai.schemas.js`. Adapters never log prompts, code or responses.
- Provider errors are `AIProviderError({ retryable })`. Only retryable errors, timeouts and schema-invalid output are retried (`AI_MAX_RETRIES`, exponential backoff from `AI_RETRY_BASE_MS`).
- Clients only ever see generic errors: `AI_TIMEOUT` (504), `AI_UNAVAILABLE` (502), `AI_INVALID_RESPONSE` (502), `VALIDATION_ERROR` (400).
- Every response carries `meta.isMock`. UIs must show mock output as a sample (use the design system `Badge`, tone `sun`, text "Sample response").
- Every call needs exactly one owner (`{ childProfileId }` or `{ guestSessionId }`) and records one `usage_events` row (`ai.project_plan`, `ai.project_code`, `ai.explain_code`, `ai.refine_project`, `ai.teacher_answer`) with provider, model, token counts and attempts. It never stores prompts, code or answers. A failed write is logged and ignored.

## Operations
| Method | Input | Output |
|---|---|---|
| `generateProjectPlan` | `{ prompt, language }` | project plan (blueprint 8.1) |
| `generateProjectCode` | `{ plan, language }` | project with `index.html`, `style.css`, `script.js` (8.2) |
| `explainCode` | `{ filePath, code, lineStart, lineEnd, explanationLanguage }` | explanation in en/hi/hinglish bound to a SHA-256 of the lines (8.3) |
| `refineProject` | `{ files, instruction, language }` | new files and a per-file change summary |
| `answerTeacherQuestion` | `{ question, explanationLanguage, context? }` | answer, language, follow-up questions |

`suggestCodeFix` (debugging) is added in Prompt 30. Content moderation (Prompt 15), the deep code validator (Prompt 19: syntax, disallowed capabilities, limits) and quotas (Prompt 37) are separate, later layers. The output schema only checks shape, flat file names and sizes.

## Configuration (`apps/api/.env`)
`AI_PROVIDER` (default `mock`; `openai`, `gemini` and `anthropic` are reserved names that fail fast at startup until their adapters exist), `AI_MODEL`, `AI_TIMEOUT_MS` (30000), `AI_MAX_RETRIES` (2), `AI_RETRY_BASE_MS` (250). Real providers will add their own key variables (server-side only).

## Mock provider
Deterministic: the same input gives the same output. It chooses a template (game, quiz, calculator, animation or webpage) by keyword in English, Hindi or Hinglish. Its code is real and runnable, and tests check that it parses, has no external URLs and no network calls.

## Adding a real provider
1. Create `providers/ai/<name>/<Name>Provider.js` extending `AIProvider`; implement the five operations, map vendor errors to `AIProviderError`, honour `signal`.
2. Add one line to `providers/ai/registry.js`.
3. Add its key variables to `.env.example` and `loadConfig` and document them here.
No change to `AIService`, schemas or feature code is needed. Run the provider through the same output-schema tests as the mock.
