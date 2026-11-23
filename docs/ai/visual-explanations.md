# Visual explanations (Prompt 28)

AI answers (code explanations and teacher answers) may carry an optional `visual`: a small **description** of a picture. The AI never sends HTML, SVG, CSS or script. Our own React components draw it.

## Format
```json
{
  "title": { "en": "How a choice works", "hi": "…", "hinglish": "…" },
  "steps": [ { "en": "…", "hi": "…", "hinglish": "…" } ],
  "flow": { "nodes": [
    { "id": "ask", "kind": "decision", "text": { "en": "Is the answer right?", "hi": "…", "hinglish": "…" }, "yes": "win", "no": "try" },
    { "id": "win", "kind": "step", "text": { … }, "next": "end" },
    { "id": "end", "kind": "end", "text": { … } } ] },
  "examples": [ { "input": "answer is right", "output": "score goes up" } ]
}
```
At least one of `steps`, `flow`, `examples`.

| Part | Limits |
|---|---|
| `title` | localized (en, hi, hinglish), 80 characters |
| `steps` | 2 to 8, localized, 120 characters each |
| `flow.nodes` | 2 to 8; `id` `[a-z0-9_]{1,20}`, unique; `kind` start / step / decision / end; text localized, 80 characters |
| flow pointers | `next` for start and step; `yes` and `no` (both) for a decision, which has no `next`; the end has none; every pointer must name a node; loops back to an earlier node are allowed |
| `examples` | 1 to 4 `{input, output}`, plain text, 60 characters each |

Any other field is rejected (strict schema). Defined in `apps/api/src/modules/ai/ai.schemas.js` (`visualExplanation`).

## Where it is checked
1. **Provider output schema** (above): invalid visuals fail the AI call, which is retried, then returns the generic `502 AI_INVALID_RESPONSE`.
2. **Policy:** every string in the visual passes the shared text policy (no links, no HTML, passes moderation) in code explanations (`explanations.policy.js`) and teacher answers (`teacher.service.js`). Nothing is stored on failure.
3. **Browser:** `parseVisual` re-checks the shape, clamps text, drops unknown fields and broken parts (a broken flow is dropped, the rest stays) and returns nothing if no usable part is left.

## Storage
- Code explanations keep the visual inside `explanation_payload` (no migration), so cached explanations return it too.
- Teacher messages store it in `teacher_messages.visual` (jsonb, nullable, 8 KB check), added by migration `20261122000009_teacher_message_visuals.sql`. A restored chat shows its pictures.

## Drawing (`apps/web/src/features/visuals/`)
- `VisualExplanation` uses plain HTML elements only, with all text as text: steps are an `<ol>`; the flow is an `<ol>` of numbered boxes labelled Start / Step / Question / End (never colour alone), with "Then", "Yes: go to step N", "No: go to step N" and "Then: go to step N" for loops; examples are a `<table>` with a caption and column headers.
- Language follows the panel's picker; a missing Hindi or Hinglish text falls back to English.
- No SVG, no `dangerouslySetInnerHTML`, no animation.
- Shown under "Explain my code" results and inside teacher answers.

## Mock provider
`VISUALS` in `providers/ai/mock/templates.js` has one visual per concept (variable, function, event, condition, CSS, HTML, general). Real providers use the same schema.
