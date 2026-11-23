# 0029: Debugging assistant: reported facts vs AI guesses

Status: accepted (Prompt 30)

## Decision
- The preview reports runtime facts (type, message, line). The server never executes code, so "verified" means "observed by the real preview run". The AI's cause and fix are always labelled as a guess.
- The report is untrusted: cleaned, clipped, moderated and passed to the AI only as data. A reported line counts only if it exists in the saved file.
- The AI sees saved code read by the server, never code from the browser, and only when the preview ran the saved code (the UI blocks the request while there are unsaved edits or a stale run).
- A suggested fix is one contiguous spot (at most 10 lines near the reported line, in the file the AI was shown) and is kept only if the whole project still passes the project validator with the fix applied. The "before" text comes from the saved file.
- Nothing changes silently: a fix is added only as a visible, resettable unsaved edit in the editor. Saving it goes through the normal paths.
- Daily limits (40 for children, 5 for guests, configurable) are checked before the AI call.

## Consequences
- The line mapping depends on how browsers number inline-script lines. It is tested with the page we generate, but must be confirmed in a real browser.
- A debug request after the child edits needs a Restart first; this keeps what the AI sees equal to what ran.
- Multi-file fixes and fixes that need new project versions are out of scope.
