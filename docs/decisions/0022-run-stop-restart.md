# 0022: Preview run states and limits

Status: accepted (Prompt 23)

## Decision
- An explicit state machine (idle, starting, running, stopped) in `usePreviewRunner`; problems (error, blocked, missing, unresponsive, startTimeout, timeLimit) are shown on top and never change what the sandbox allows.
- Stop removes the iframe (the only reliable way to halt it) and keeps messages. Restart always rebuilds from the current files with a new nonce.
- Limits: 5 s to become ready, 5 s heartbeat watchdog, 10 min maximum run, 30 messages per second and 200 per run, 500 characters per message and 20,000 characters kept. Heartbeats do not count towards caps.
- Code changes never restart a run by themselves; the child gets a hint instead.

## Consequences
- The 10-minute cap and the other values are constants in `previewProtocol.js`.
- A busy loop that freezes the tab still cannot be interrupted from outside (ADR 0021).
