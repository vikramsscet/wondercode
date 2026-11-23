# AI Teacher panel (Prompt 26)

`apps/web/src/features/workspace/TeacherPanel.jsx`, shown under "Explain my code" in a saved project's workspace. The sample workspace shows "Open a saved project to chat with the AI teacher."

- **Chat:** child bubbles on the right, teacher bubbles on the left, in a `role="log"` region (`aria-live="polite"`) with screen-reader prefixes ("You said", "Teacher said"). Mock answers carry a "Sample answer" badge.
- **Suggested questions:** three starter chips per language; after each answer the chips are the teacher's follow-up questions.
- **Language:** English, Hindi or Hinglish, defaulting to the child's preference; sent with every question.
- **Input:** labelled textarea, 500-character limit with counter, Enter sends, Shift+Enter adds a line, Enter during IME composition does not send, empty input cannot be sent, the field and button are disabled while waiting (no double sends).
- **States:** "Thinking…", a calm error with "Try again" (re-sends the same question without duplicating the bubble), and a note bubble when a question is blocked or too short.
- **Safe rendering:** text only. `` `code` `` is styled, everything else (including anything that looks like HTML) is shown as plain text. No `dangerouslySetInnerHTML`.
- **Privacy:** the conversation lives only in component state. Nothing is written to browser storage. Only the question and language are sent: no code, files or tools. Provider credentials never reach the browser.
- Visual explanations (diagrams, step sequences) come in Prompt 28; the message component is where they will plug in.
