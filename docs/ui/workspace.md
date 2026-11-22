# Coding workspace (Prompt 20)

Layout shell for viewing a project's files. Code lives in `apps/web/src/features/workspace/`.

## Routes
- `/workspace` (child, inside the child layout, wider container) and `/try/workspace` (guest).
- Both show **sample files** (labelled "Sample") until generated project versions are loaded (Prompt 24).
- The saved step of Prompt Studio links to the matching route ("Open workspace").

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
- Edits are lost on reload. Saving and unsaved-edit recovery are Prompt 24.
- The selection (`{path, startLine, endLine}`, line numbers only, never code) is held in `Workspace` state for the explanations in Prompt 25.

## Testing note
Monaco needs a real browser, so unit tests replace `MonacoEditor` with a textarea that has the same props. The real editor is covered by the build, not by unit tests; check it by hand with `npm run dev:web` at `/workspace`.

## Not included
Resizable panes, saving, running code, loading real projects.
