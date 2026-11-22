# Coding workspace (Prompt 20)

Layout shell for viewing a project's files. Code lives in `apps/web/src/features/workspace/`.

## Routes
- `/workspace` (child, inside the child layout, wider container) and `/try/workspace` (guest).
- Both show **sample files** (labelled "Sample") until generated project versions are loaded (Prompt 24).
- The saved step of Prompt Studio links to the matching route ("Open workspace").

## Components
- `Workspace` takes `files` (`[{path, content}]`) and `title`; with no `files` it uses `mockProject.js`.
- `FileExplorer`: file list, icon per type, `aria-current` on the active file, Up/Down/Home/End keys.
- `EditorPane`: **placeholder**, read-only code with line numbers in a `<pre>`. Monaco replaces it in Prompt 21.
- `PreviewPane`: **placeholder**, runs nothing. The sandboxed iframe arrives in Prompt 22.

## Responsive behaviour
- `lg` and up: three columns (files 14rem, code, preview).
- Below `lg`: a tab bar (Files, Code, Preview) shows one pane at a time. All panes stay mounted, so state is kept.
- Choosing a file on a small screen jumps to the Code tab.

## Not included
Resizable panes, editing, running code, loading real projects.
