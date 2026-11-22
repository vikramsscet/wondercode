# Isolated browser preview (Prompts 22 and 23)

Code: `apps/web/src/features/workspace/PreviewPane.jsx` and `preview/`.

## How it works
1. The child presses **Run** (or **Restart**). Nothing runs on page load, file switch or edit.
2. `buildPreviewDocument(files, nonce)` makes one self-contained page from a **snapshot** of the current files: `style.css` and `script.js` are inlined into `index.html`, `<base>` and `<meta http-equiv>` are removed, and `</script` / `</style` inside the code is escaped.
3. The page goes into `<iframe sandbox="allow-scripts" srcdoc=...>`.

## Isolation
- **Sandbox:** only `allow-scripts`. No `allow-same-origin`, so the code has an opaque origin and cannot read the app's cookies, storage, Supabase session or tokens. No top navigation, forms, popups or modals.
- **CSP (first element in the page):** `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`. No network, no external files, no nested frames.
- **No server-side execution.** Code only ever runs in the child's browser.

## Messages (one way: iframe to parent)
The parent never posts into the iframe. A bootstrap script reports `ready`, `heartbeat`, `log`, `error` and `blocked` (CSP violation). The parent accepts a message only if all hold: `event.source` is this iframe, `event.origin` is `"null"`, the per-run random nonce matches, and the type is on the allowlist. Limits: 200 messages per run, 500 characters each, last 50 console lines shown. The nonce is visible to the child's own code, which is fine: it only stops other windows forging messages.

## Run states and controls (Prompt 23)
State lives in `preview/usePreviewRunner.js`.

| State | Meaning | Run | Stop | Restart |
|---|---|---|---|---|
| idle | never run | on | off | off |
| starting | waiting for the page to say `ready` | off | on | on |
| running | page is reporting in | off | on | on |
| stopped | stopped by the child, or by a limit | on | off | on |

- **Stop** removes the iframe and keeps the messages. **Restart** builds a fresh snapshot from the current edits with a new nonce and clears messages.
- Changing code while running shows "Your code has changed since this run" (never auto-restarts).
- On small screens, Run/Restart switches to the Preview tab.
- Unmounting removes the iframe and the message listener.

### Limits
| Limit | Value | Result |
|---|---|---|
| No `ready` message | 5 s | stopped, "took too long to start" |
| No message at all (heartbeat is every 1 s) | 5 s | stopped, "wasn't responding" |
| Run length | 10 min | stopped, "to save energy" |
| Non-heartbeat messages | 30 per second, 200 per run | extra dropped, "Some messages were hidden" |
| Text per message / lines / total | 500 chars / 50 lines / 20,000 chars | clipped or oldest dropped |
| Identical consecutive lines | collapsed | "(×N)" |

Heartbeats are not counted towards the message cap (a Prompt 22 bug would have killed a healthy page after about 200 seconds).

## Child-friendly states
Console output appears under "Messages from your project". Runtime errors, blocked network access, a missing `index.html` and an unresponsive page each show a calm message.

## Execution limits and known gaps
- **Watchdog:** no heartbeat for 5 seconds removes the iframe ("stopped because it wasn't responding").
- A tight infinite loop cannot be interrupted from outside. If the browser runs the sandbox in its own process the watchdog works; otherwise the tab may freeze. Loop-guard injection is future work. The validator already warns about loops that may never end.
- `srcdoc` shares the app's process and site; a separate preview domain would be stronger and is a later hardening step.
- Unit tests cannot run the real sandbox (happy-dom), so check by hand: `npm run dev:web`, open `/workspace`, press Run, and try `fetch('https://example.com')` and `localStorage` in `script.js` (both must fail).
- Stop, Restart and richer run states: Prompt 23. Loading real projects: Prompt 24.
