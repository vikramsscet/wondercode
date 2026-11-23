# AI Teacher panel (Prompts 26 and 27)

`apps/web/src/features/workspace/TeacherPanel.jsx`, shown under "Explain my code" in a saved project's workspace. The sample workspace shows "Open a saved project to chat with the AI teacher."

## Chat
- Child bubbles on the right, teacher bubbles on the left, in a `role="log"` region (`aria-live="polite"`) with screen-reader prefixes. Mock answers carry a "Sample answer" badge.
- Suggested starter questions per language; after each answer the chips are the teacher's follow-ups.
- Language picker (English, Hindi, Hinglish), defaulting to the child's preference, sent with every question.
- Labelled textarea, 500-character limit with counter, Enter sends, Shift+Enter adds a line, Enter during IME composition does not send, empty input cannot be sent, field and button are disabled while waiting.
- States: "Thinking…", a calm error with "Try again" (re-sends the same question without a duplicate bubble), a note bubble for blocked or too-short questions, and the server's friendly text for the daily limit and a full chat.
- Text only: `` `code` `` is styled, everything else (even HTML-looking text) is plain text.

## Project context (Prompt 27)
- The panel knows the project and version, and the lines selected in the editor.
- A checkbox "Show the teacher my selected lines (script.js, lines 2 to 3)" is on when the selection is in the open file and the file has no unsaved edits. Unchecking keeps the lines private. Only the **file name and line numbers** are sent; the server reads the saved code itself.
- If the file has unsaved edits the panel says the teacher looks at the saved code and sends no lines.
- The latest chat is restored on load (`GET /teacher/conversations`). "Clear chat" deletes it on the server.
- Nothing is written to browser storage.

## Pictures (Prompt 28)
When an answer carries a `visual`, it is drawn inside the teacher's bubble (and after a restore) by `VisualExplanation`. See `docs/ai/visual-explanations.md`.
