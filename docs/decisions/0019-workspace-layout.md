# 0019: Workspace layout with placeholder panes

Status: accepted (Prompt 20)

## Decision
- Build the three-pane frame first (files, code, preview) with placeholder editor and preview, so Monaco (21) and the sandboxed iframe (22) drop into fixed slots.
- Responsive strategy: side-by-side from `lg`; tabs below. Panes are hidden with CSS, not unmounted, so editor and preview state survive tab switches.
- No drag-resizable split: extra complexity and accessibility cost for little benefit now.
- Sample files are used until Prompt 24; the UI labels them "Sample".
- Nothing is executed in this prompt.

## Consequences
The child layout widens only for `/workspace`. Real project loading and unsaved-edit recovery are Prompt 24.
