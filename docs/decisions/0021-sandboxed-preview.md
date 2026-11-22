# 0021: Sandboxed iframe preview

Status: accepted (Prompt 22)

## Decision
- Run project code only in a `sandbox="allow-scripts"` iframe (opaque origin) with a deny-by-default CSP, built from a snapshot taken when Run is pressed.
- Messages go one way (iframe to parent), checked by source, origin `"null"`, nonce, type allowlist and size/count limits. The parent sends nothing in.
- Never auto-run: AI-made code starts only after the child presses Run.
- Heartbeat watchdog (5 s) removes an unresponsive frame.
- Static validation (ADR 0018) is the first check; this sandbox is the real boundary.

## Consequences
- `srcdoc` rather than a separate origin: simple, but a dedicated preview domain is stronger (later).
- Infinite loops can freeze the tab when the sandbox shares a process; loop guards are future work.
- Real sandbox behaviour needs a manual browser check.
