# 0027: Visual explanations as validated data

Status: accepted (Prompt 28)

## Decision
- The AI describes pictures as a small structured `visual` (steps, flow, input/output examples), never as HTML or SVG. Our components draw it from plain HTML elements.
- The format is validated three times: provider output schema (strict, size-limited, graph rules), the shared text policy (no links, HTML or unsafe text), and a defensive parser in the browser.
- Flow diagrams are numbered boxes with text arrows ("Yes: go to step 3"), not an auto-laid-out graph. This is readable by children and screen readers, needs no layout engine and cannot run code.
- Visuals are optional. Explanations store them in their existing JSON payload; teacher messages get a nullable `visual` column (migration `20261122000009`).

## Consequences
- Migration 9 must be applied by hand to keep pictures in restored chats (without it, saving teacher messages fails because the column is missing).
- A richer, drawn graph can be added later without changing the data format.
- Real providers must be prompted to return the schema; invalid visuals fail the answer rather than being repaired.
