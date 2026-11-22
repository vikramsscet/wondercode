# Code validation (Prompt 19)

`validateProject(files)` in `apps/api/src/modules/validation/` is a pure function. It **parses** HTML (parse5), CSS (css-tree) and JavaScript (acorn) and walks the trees. It never executes code: no `eval`, `vm`, child processes or server-side rendering.

Result:
```
{ valid, errors[], warnings[], summary: { files, errors, warnings, checked[] } }
issue = { severity, category, code, file, line, column, message }
category: path | type | size | syntax | capability | dependency
```
`valid: true` means "parsed and statically checked with no errors". It does not mean the code runs or works.

## Rules
- Files: exactly `index.html`, `style.css`, `script.js`; valid names, matching types, no duplicates; 1 byte to 200 KB each, 400 KB total.
- Syntax: HTML (serious parse errors only; small slips are warnings), CSS (strict parse errors), JavaScript (with line and column; `import`/`export` reported as a dependency problem).
- HTML: only `<script src="script.js">` and `<link rel="stylesheet" href="style.css">`; URL attributes may point only to those files or `#anchors`; no iframe/frame/object/embed/base/form/applet, `meta refresh`, inline `on*` handlers or `javascript:` URLs. Inline `<style>` is a warning.
- CSS: no `@import`, `url()` other than `#fragments`, `image-set()`/`src()`, `expression()`, `behavior`, `-moz-binding`.
- JavaScript (AST based): network (`fetch`, XHR, WebSocket, EventSource, `sendBeacon`), modules (`import()`, `require`, `importScripts`), workers, browser storage and cookies, device APIs (location, camera, microphone, clipboard), `postMessage`, dynamic code (`eval`, `Function`, `.constructor`, string timers, `with`), navigation (`location`, `window.open`, `top`/`parent`), `document.write`, creating script/iframe/link elements, URL-like strings, and window aliasing or computed window lookups (`window["fe"+"tch"]`). A name the program declares itself shadows the browser global.
- Warnings only: `innerHTML`-style sinks, loops that may never stop.

## Where it runs
- `POST /projects/generate`: AI output is validated; on errors it retries generation once, then returns a generic 502. Nothing invalid is saved. The response includes `validation` and `validated`.
- `GET /projects/:id`: re-validates on read.
- `POST /projects/validate` `{ files }` (same auth as other project routes): returns the result as 200 and saves nothing. The API-wide 100 KB JSON limit applies.

## Limits to know
Static analysis is one defence layer, not a sandbox. It cannot catch every obfuscation (for example `this[key]` lookups). The real boundary is the sandboxed, CSP-restricted preview (Prompt 21+). Per-user rate limits for validation arrive with Prompt 37.
