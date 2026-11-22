# ADR 0018: Static code validation

Status: accepted (Prompt 19)

- Real parsers (`acorn`, `parse5`, `css-tree`, added as API dependencies) instead of regexes, so checks are on syntax trees and are harder to bypass. Code is parsed, never run.
- One validator shared by generation, reads and `POST /projects/validate`; Prompt 18's regex policy now delegates to it.
- Errors block saving; warnings are returned. Messages are child-friendly; codes are stable.
- AI output that fails validation is retried once (`GENERATION_ATTEMPTS = 2`), then rejected with a generic error. Issue codes are logged, never the code itself.
- `validated: true` means parsed and statically checked only. It must not be presented as "works" or "ran".
- Known limit: static analysis cannot be complete. The sandboxed preview (Prompts 20 to 23) remains the security boundary.
