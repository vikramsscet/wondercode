import { useState } from 'react';
import { Alert, Button, Card, SelectField, Spinner } from '../../components/ui/index.js';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import { LANGUAGES } from '../prompt-studio/promptStudioData.js';

// Problems the helper can look at (the others, like a missing index.html, explain themselves).
const KINDS = ['error', 'unresponsive', 'blocked'];
const KIND_TEXT = {
  error: 'Your code stopped with an error',
  unresponsive: 'Your project stopped answering',
  blocked: 'Your project tried to use the internet',
};

const errorText = (err) => {
  if (err instanceof ApiError) {
    if (err.code === 'DEBUG_LIMIT_REACHED') return err.message;
    if (err.status === 429) return 'Lots of questions! Please wait a little and try again.';
    if (err.status === 401) return 'Your visit has ended. Please start again from the home page.';
  }
  return "I couldn't look at that just now. Please try again.";
};

// Replaces lines start..end (1-based) of `content` with `replacement`.
export function applyLines(content, start, end, replacement) {
  const lines = content.split('\n');
  return [...lines.slice(0, start - 1), ...replacement.split('\n'), ...lines.slice(end)].join('\n');
}

// Helps a child understand a problem the preview REPORTED. Facts (what the preview saw) are kept
// apart from guesses (the AI's cause and fix). A fix is only ever added to the editor as an
// unsaved change the child can see, run and reset; nothing is changed silently.
export default function DebugPanel({ debug, run, files, edited, onApplyFix }) {
  const [language, setLanguage] = useState(debug?.defaultLanguage ?? 'en');
  const [state, setState] = useState({ problem: null }); // { problem, status, data | message }
  const [applied, setApplied] = useState(null); // path of the file a fix was added to

  const problem = run?.problem;
  if (!debug || !problem || !KINDS.includes(problem.kind)) return null;

  const current = state.problem === problem ? state : { status: 'idle' };
  const blocker = edited
    ? 'Reset your unsaved changes first, so I look at the same code that ran.'
    : run.changed
      ? 'Your code changed since it ran. Press Restart, then ask me again.'
      : null;

  const ask = async () => {
    setState({ problem, status: 'sending' });
    setApplied(null);
    try {
      const data = await apiRequest(`/projects/${debug.projectId}/debug`, {
        method: 'POST',
        body: {
          versionId: debug.versionId,
          error: {
            kind: problem.kind,
            ...(problem.name && { name: problem.name }),
            ...(problem.message && { message: problem.message }),
            ...(problem.filePath && { filePath: problem.filePath }),
            ...(problem.line && { line: problem.line }),
            ...(problem.column && { column: problem.column }),
          },
          explanationLanguage: language,
        },
        childId: debug.childId,
        guestToken: debug.guestToken,
      });
      setState((s) => (s.problem === problem ? { problem, status: 'done', data } : s));
    } catch (err) {
      setState((s) =>
        s.problem === problem ? { problem, status: 'error', message: errorText(err) } : s,
      );
    }
  };

  const d = current.data;
  const ok = current.status === 'done' && d.status === 'ok';
  const v = ok ? d.verified : null;
  const file = v?.filePath ? files.find((f) => f.path === v.filePath) : null;
  const codeLine = file && v.line ? file.content.split('\n')[v.line - 1] : null;
  const fix = ok ? d.fix : null;
  const fixFile = fix ? files.find((f) => f.path === fix.filePath) : null;
  const fixStillFits =
    fix &&
    fixFile &&
    fixFile.content
      .split('\n')
      .slice(fix.lineStart - 1, fix.lineEnd)
      .join('\n') === fix.before;

  return (
    <Card className="mt-4" aria-labelledby="debug-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="debug-title" className="text-xl font-extrabold">
            Help me fix it
          </h2>
          <p className="text-ink-700">{KIND_TEXT[problem.kind]}.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </SelectField>
          <Button onClick={ask} disabled={Boolean(blocker) || current.status === 'sending'}>
            Help me understand
          </Button>
        </div>
      </div>
      {blocker && <p className="mt-3 text-ink-600">{blocker}</p>}

      <div aria-live="polite">
        {current.status === 'sending' && (
          <p className="mt-3 flex items-center gap-2 font-semibold text-ink-600">
            <Spinner label="" /> Looking at your code…
          </p>
        )}
        {current.status === 'error' && (
          <Alert tone="warning" className="mt-3">
            {current.message}
          </Alert>
        )}
        {current.status === 'done' && d.status !== 'ok' && (
          <Alert tone="info" className="mt-3">
            {d.message}
          </Alert>
        )}
        {ok && (
          <div className="mt-3 space-y-4">
            <section aria-label="What the computer told us" className="rounded-xl bg-mint-100 p-3">
              <h3 className="font-extrabold">What the computer told us (checked)</h3>
              {v.message && <p className="mt-1 font-mono text-sm">{v.message}</p>}
              {v.filePath && (
                <p className="mt-1 text-sm font-semibold">
                  {v.filePath}
                  {v.line ? `, line ${v.line}` : ''}
                </p>
              )}
              {codeLine !== null && codeLine !== undefined && (
                <pre className="mt-1 overflow-auto rounded bg-white p-2 font-mono text-sm">
                  {codeLine}
                </pre>
              )}
            </section>

            <section aria-label="What it means">
              <h3 className="font-extrabold">What it means</h3>
              <p className="mt-1">{d.explanation[language] ?? d.explanation.en}</p>
            </section>

            <section aria-label="My guess" className="rounded-xl bg-sun-100 p-3">
              <h3 className="font-extrabold">My guess (not checked)</h3>
              <p className="mt-1">{d.likelyCause[language] ?? d.likelyCause.en}</p>
              {fix && (
                <div className="mt-2">
                  <p className="font-semibold">{fix.description[language] ?? fix.description.en}</p>
                  <p className="mt-1 text-sm font-bold">
                    {fix.filePath},{' '}
                    {fix.lineStart === fix.lineEnd
                      ? `line ${fix.lineStart}`
                      : `lines ${fix.lineStart} to ${fix.lineEnd}`}
                  </p>
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-bold">Now</p>
                      <pre
                        aria-label="Code now"
                        className="overflow-auto rounded bg-white p-2 font-mono text-sm"
                      >
                        {fix.before}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-bold">After the fix</p>
                      <pre
                        aria-label="Code after the fix"
                        className="overflow-auto rounded bg-white p-2 font-mono text-sm"
                      >
                        {fix.replacement}
                      </pre>
                    </div>
                  </div>
                  {applied ? (
                    <Alert tone="success" className="mt-2">
                      I added it to {applied} as a change you haven't saved. Press Restart to try
                      it, or use "Reset this file" to undo it.
                    </Alert>
                  ) : fixStillFits ? (
                    <Button
                      className="mt-2"
                      onClick={() => {
                        onApplyFix(
                          fix.filePath,
                          applyLines(fixFile.content, fix.lineStart, fix.lineEnd, fix.replacement),
                        );
                        setApplied(fix.filePath);
                      }}
                    >
                      Put this fix in my code
                    </Button>
                  ) : (
                    <p className="mt-2 text-sm text-ink-700">
                      That code has changed, so ask me again.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Card>
  );
}
