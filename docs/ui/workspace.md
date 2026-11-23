# Coding workspace (Prompt 20)

Layout shell for viewing a project's files. Code lives in `apps/web/src/features/workspace/`.

## Routes
- `/workspace` (child, wider layout) and `/try/workspace` (guest): **sample files**, labelled "Sample".
- `/workspace/:projectId` and `/try/workspace/:projectId`: a saved project (Prompt 24). `useProject` calls `GET /projects/:id` with the child or guest credentials (the API checks ownership and file hashes and re-validates). States: loading, not found (link to make a new project), error (Try again).
- The saved step of Prompt Studio links to `/workspace/<id>` or `/try/workspace/<id>`.
- The title row shows "Version N, checked" ("checked" = parsed and statically validated, not run).

## Components
- `Workspace` takes `files` (`[{path, content}]`) and `title`; with no `files` it uses `mockProject.js`.
- `FileExplorer`: file list, icon per type, `aria-current` on the active file, Up/Down/Home/End keys.
- `EditorPane`: wraps the Monaco editor (Prompt 21), lazy-loaded, with a status line showing the selected lines and a "Changed, not saved" marker.
- `MonacoEditor`: Monaco bundled locally (no CDN), HTML/CSS/JS highlighting, line numbers, no minimap, word wrap, 16px font. One model per file path, so undo history and cursor survive file switching. Language services (validation, suggestions) are not loaded.
- `PreviewPane`: sandboxed iframe preview with a Run button (Prompt 22), see `docs/ui/preview.md`.

## Responsive behaviour
- `lg` and up: three columns (files 14rem, code, preview).
- Below `lg`: a tab bar (Files, Code, Preview) shows one pane at a time. All panes stay mounted, so state is kept.
- Choosing a file on a small screen jumps to the Code tab.

## Editing and line tracking
- `Workspace` keeps edits per path in memory (`edits`); the original file contents are never modified. A file is "changed" while its text differs from the original.
- There is no server save yet (versions arrive with Prompt 29). Edits are protected locally instead, see below.
- The selection (`{path, startLine, endLine}`, line numbers only, never code) is held in `Workspace` state for the explanations in Prompt 25.

## Recovering unsaved edits (`drafts.js`)
- Edits are saved (debounced 500 ms) to `localStorage` as a draft keyed by child/guest, project and version. Code only, never prompts.
- On load, a draft is **offered, never applied silently**: "We found changes you hadn't saved" with Restore and Throw away.
- Drafts are capped (400 KB total, 200 KB per file), expire after 14 days, and are validated on load: only known file paths, text content, and content that really differs from the saved version.
- "Reset this file" and "Reset all changes" return to the saved version and remove the draft.
- The browser asks before leaving the page only while edits exist.
- Storage may be blocked or corrupt; every call is wrapped and failures are ignored.
- On a shared computer another person could see a draft. The key includes the child's id, so other profiles do not get it.

## Explain my code (Prompt 25)
`ExplainPanel` sits under the panes. It uses the selected lines (line numbers from Monaco), a language picker (default: the child's explanation language) and `POST /projects/:id/explanations`. The browser hashes the selected **saved** lines (SHA-256) and sends the hash, never the code. Edited files are blocked ("Reset your changes to this file first"), the sample workspace shows "Open a saved project…", and the 409 stale case says to select the lines again. Mock output carries a "Sample explanation" badge. See `docs/api/explanations.md`.

Explanation results also show a picture when the AI sends one (Prompt 28, `docs/ai/visual-explanations.md`).

## Debugging help (Prompt 30)
`DebugPanel` appears when a run reports a problem and explains it, keeping what the preview reported apart from the AI's guess; a suggested fix is added only as an unsaved edit. See `docs/ui/debugging.md` and `docs/api/debug.md`.

## Try a change (Prompt 29)
`ExperimentPanel` ("Try a change") lets the child describe a change in words (or pick an idea chip) and calls `POST /projects/:id/experiments` with the version they are looking at. It is disabled while any file has unsaved edits, because a change is made from the saved project. On success it lists the changed files with a child-friendly summary in the chosen language and says "Your earlier version is safe"; **Open the new version** reloads the workspace on version 2, shows "This is version 2. You changed style.css." and marks those files "changed" in the file list. Blocked, too-short and no-change answers show a calm note; "newer version" offers **Open it again**; limits show the server's friendly text. See `docs/api/experiments.md`.

## AI teacher (Prompt 26)
`TeacherPanel` sits under the explain panel. See `docs/ui/ai-teacher.md` and `docs/api/teacher.md`.

## Source shown = source run
The preview runs a snapshot built from the same file list the editor holds (edited text, not the original). Editing after a run shows "Your code has changed since this run" until Restart.

## Testing note
Monaco needs a real browser, so unit tests replace `MonacoEditor` with a textarea that has the same props. The real editor is covered by the build, not by unit tests; check it by hand with `npm run dev:web` at `/workspace`.

## Not included
Resizable panes, saving, running code, loading real projects.
