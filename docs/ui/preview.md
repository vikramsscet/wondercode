# Isolated browser preview (Prompt 22)

Code: `apps/web/src/features/workspace/PreviewPane.jsx` and `preview/`.

## How it works
1. The child presses **Run**. Nothing runs on page load, file switch or edit.
2. `buildPreviewDocument(files, nonce)` makes one self-contained page from a **snapshot** of the current files: `style.css` and `script.js` are inlined into `index.html`, `<base>` and `<meta http-equiv>` are removed, and `</script` / `</style` inside the code is escaped.
3. The page goes into `<iframe sandbox="allow-scripts" srcdoc=...>`.

## Isolation
- **Sandbox:** only `allow-scripts`. No `allow-same-origin`, so the code has an opaque origin and cannot read the app's cookies, storage, Supabase session or tokens. No top navigation, forms, popups or modals.
- **CSP (first element in the page):** `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`. No network, no external files, no nested frames.
- **No server-side execution.** Code only ever runs in the child's browser.

## Messages (one way: iframe to parent)
The parent never posts into the iframe. A bootstrap script reports `ready`, `heartbeat`, `log`, `error` and `blocked` (CSP violation). The parent accepts a message only if all hold: `event.source` is this iframe, `event.origin` is `"null"`, the per-run random nonce matches, and the type is on the allowlist. Limits: 200 messages per run, 500 characters each, last 50 console lines shown. The nonce is visible to the child's own code, which is fine: it only stops other windows forging messages.

## Child-friendly states
Console output appears under "Messages from your project". Runtime errors, blocked network access, a missing `index.html` and an unresponsive page each show a calm message.

## Execution limits and known gaps
- **Watchdog:** no heartbeat for 5 seconds removes the iframe ("stopped because it wasn't responding").
- A tight infinite loop cannot be interrupted from outside. If the browser runs the sandbox in its own process the watchdog works; otherwise the tab may freeze. Loop-guard injection is future work. The validator already warns about loops that may never end.
- `srcdoc` shares the app's process and site; a separate preview domain would be stronger and is a later hardening step.
- Unit tests cannot run the real sandbox (happy-dom), so check by hand: `npm run dev:web`, open `/workspace`, press Run, and try `fetch('https://example.com')` and `localStorage` in `script.js` (both must fail).
- Stop, Restart and richer run states: Prompt 23. Loading real projects: Prompt 24.
