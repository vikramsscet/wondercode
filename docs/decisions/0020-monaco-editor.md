# 0020: Monaco editor, bundled locally

Status: accepted (Prompt 21)

## Decision
- Use `monaco-editor` with `@monaco-editor/react`, bundled by Vite and configured with `loader.config({ monaco })`. Nothing is fetched from a CDN.
- Load only editor features plus basic (Monarch) highlighting for HTML, CSS and JavaScript. The TypeScript, CSS and HTML language services and their workers are not loaded, so there is no in-editor validation or suggestions. The server validator (ADR 0018) stays the single source of truth for safety.
- One model per file path (the `path` prop) keeps undo history and cursor per file.
- The editor is lazy-loaded (`React.lazy`) in its own chunk (about 3.3 MB, 0.84 MB gzip) plus a 232 kB editor worker, so the dashboard does not pay for it.
- Edits live in memory in `Workspace`; originals are untouched. No autosave until Prompt 24.
- Selection tracking reports line numbers only.

## Consequences
Large chunk on the workspace route. Unit tests mock the editor, so the real Monaco needs a manual check in a browser.
