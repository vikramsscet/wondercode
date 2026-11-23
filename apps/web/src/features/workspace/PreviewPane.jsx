import { useEffect, useRef } from 'react';
import { Alert, Button } from '../../components/ui/index.js';
import { usePreviewRunner } from './preview/usePreviewRunner.js';

const STATUS_TEXT = {
  idle: 'Ready when you are',
  starting: 'Starting…',
  running: 'Running',
  stopped: 'Stopped',
};

const PROBLEMS = {
  blocked: () => "Your project tried to reach the internet, which isn't allowed here.",
  missing: () => "We couldn't find index.html, so there is nothing to show yet.",
  error: (p) =>
    `Your code hit a problem: ${p.message}${p.line ? ` (${p.filePath}, line ${p.line})` : ''}`,
  unresponsive: () =>
    "Your project stopped because it wasn't responding. Check for a loop that never ends.",
  startTimeout: () => 'Your project took too long to start, so we stopped it. Try Run again.',
  timeLimit: () => 'We stopped your project to save energy. Press Run to start it again.',
};

// Runs the project in a sandboxed iframe (see preview/ and docs/ui/preview.md). It only starts
// when the child presses Run or Restart, and runs a snapshot of the files at that moment.
export default function PreviewPane({ files, onStart, onRun }) {
  const frameRef = useRef(null);
  const r = usePreviewRunner(files, frameRef);
  // Tell the workspace how the run is going (for the debugging helper).
  useEffect(() => {
    onRun?.({ problem: r.problem, changed: r.changed, status: r.status });
  }, [onRun, r.problem, r.changed, r.status]);
  const live = r.status === 'starting' || r.status === 'running';
  const go = () => {
    onStart?.();
    r.start();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-4 py-2">
        <h2 className="font-extrabold">Preview</h2>
        <div className="flex items-center gap-2">
          <span aria-live="polite" className="mr-1 text-sm font-bold text-ink-600">
            {STATUS_TEXT[r.status]}
          </span>
          <Button size="sm" onClick={go} disabled={live}>
            Run
          </Button>
          <Button size="sm" variant="outline" onClick={r.stop} disabled={!live}>
            Stop
          </Button>
          <Button size="sm" variant="outline" onClick={go} disabled={r.status === 'idle'}>
            Restart
          </Button>
        </div>
      </div>
      <div className="flex min-h-48 flex-1 flex-col bg-white">
        {r.run ? (
          <iframe
            key={r.run.nonce}
            ref={frameRef}
            title="Project preview"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={r.run.srcDoc}
            className="w-full flex-1 border-0"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-5xl" aria-hidden="true">
              🚀
            </span>
            <p className="text-lg font-bold">
              {r.status === 'stopped' ? 'Your project is stopped' : 'Press Run to see your project'}
            </p>
            <p className="text-ink-600">Nothing runs until you press Run.</p>
          </div>
        )}
      </div>
      {r.changed && live && (
        <Alert tone="info" className="m-3 mb-0">
          Your code has changed since this run. Press Restart to see the new version.
        </Alert>
      )}
      {r.problem && (
        <Alert
          tone={['info'].includes(r.problem.kind) ? 'info' : 'warning'}
          className="m-3"
          key={r.problem.kind}
        >
          {PROBLEMS[r.problem.kind](r.problem)}
        </Alert>
      )}
      {r.logs.length > 0 && (
        <section
          aria-label="Messages"
          className="max-h-32 overflow-auto border-t border-ink-200 p-3"
        >
          <h3 className="text-sm font-extrabold">Messages from your project</h3>
          <ul className="font-mono text-sm">
            {r.logs.map((l, i) => (
              <li key={i} className={l.level === 'error' ? 'text-coral-700' : undefined}>
                {l.text}
                {l.count > 1 && ` (×${l.count})`}
              </li>
            ))}
          </ul>
          {r.hidden && <p className="mt-1 text-sm text-ink-600">Some messages were hidden.</p>}
        </section>
      )}
      {r.hidden && r.logs.length === 0 && (
        <p className="p-3 text-sm text-ink-600">Some messages were hidden.</p>
      )}
    </div>
  );
}
