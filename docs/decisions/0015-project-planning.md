# ADR 0015: Project planning endpoint

Status: accepted (Prompt 16)

- One endpoint, `POST /prompts/plan`, chains prompt analysis and planning, so the UI needs one call shape. Clarification answers go in `answers` and are merged and re-moderated with the prompt.
- Plans gained `interaction` and `expectedBehaviour` (FR-04), localized in en/hi/hinglish.
- Policy is enforced after the provider returns (not trusted to the model): allowed files, no URLs, moderated text.
- Plans are not persisted until generation (Prompt 18); no new tables.
- Children's age and interest tags are passed to the planner; guests get neutral plans. No free-text child data is sent.
