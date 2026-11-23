# Debugging assistant (Prompt 30)

## Capturing errors (preview)
The sandbox bootstrap now reports an error's type, line and column as well as its message. When the child's `script.js` is inlined into the preview page, `buildPreview` records where it sits (`startLine`, `lineCount`). The runner turns a page line into a line of `script.js` only if it falls inside the script; otherwise the line is dropped. The message under the preview then reads "Your code hit a problem: … (script.js, line 3)".

**Assumption to verify in a real browser:** the browser reports `lineno` for an inline script relative to the whole page (the first script line shares its page line with the `<script>` tag). The unit tests cannot run the real sandbox. To check: `npm run dev:web`, open a project, add `scor += 1;` as line 3 of `script.js`, press Run, and confirm the message says line 3.

## "Help me fix it" panel (`DebugPanel.jsx`)
Shown under the workspace when a run reports an error, an unresponsive page or blocked internet access (other messages, like a missing `index.html`, explain themselves).
- **"Help me understand"** is enabled only when the code that ran is the saved code: it is disabled with a reason when any file has unsaved edits or the code changed since the run ("Press Restart, then ask me again").
- It sends only what the preview reported (kind, name, message, file, line, column), never code.
- The result keeps facts and guesses apart: **What the computer told us (checked)** (message, file, line, and that line of code from the saved file), **What it means**, and **My guess (not checked)** with the likely cause.
- A suggested fix is shown as **Now** and **After the fix**. **Put this fix in my code** adds it to the editor as an **unsaved edit** (opens the file; "Changed, not saved" appears). The child can press Restart to try it, or "Reset this file" to undo it. If the saved lines no longer match the fix's "before" text, the fix is not offered ("ask me again").
- Language picker (English, Hindi, Hinglish); friendly messages for blocked messages, failures and the daily limit.
