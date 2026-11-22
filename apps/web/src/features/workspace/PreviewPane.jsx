import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '../../components/ui/index.js';
import { buildPreviewDocument } from './preview/buildPreviewDocument.js';
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_LOG_LINES,
  MAX_MESSAGES,
  acceptMessage,
  newNonce,
} from './preview/previewProtocol.js';

// Runs the project inside a sandboxed iframe (opaque origin, strict CSP). It only starts when
// the child presses Run, and it runs a snapshot, so what is shown is exactly what was run.
// Stop/Restart and richer states come in Prompt 23.
export default function PreviewPane({ files }) {
  const [run, setRun] = useState(null); // { nonce, srcDoc }
  const [logs, setLogs] = useState([]);
  const [problem, setProblem] = useState(null); // error | blocked | unresponsive | missing
  const frameRef = useRef(null);
  const lastBeat = useRef(0);
  const count = useRef(0);

  const start = () => {
    const nonce = newNonce();
    const srcDoc = buildPreviewDocument(files, nonce);
    setLogs([]);
    count.current = 0;
    if (!srcDoc) {
      setRun(null);
      setProblem({ kind: 'missing' });
      return;
    }
    lastBeat.current = Date.now();
    setProblem(null);
    setRun({ nonce, srcDoc });
  };

  useEffect(() => {
    if (!run) return undefined;
    const onMessage = (event) => {
      const msg = acceptMessage(event, frameRef.current?.contentWindow, run.nonce);
      if (!msg || ++count.current > MAX_MESSAGES) return;
      lastBeat.current = Date.now();
      if (msg.type === 'log') {
        setLogs((prev) => [...prev, msg].slice(-MAX_LOG_LINES));
      } else if (msg.type === 'error') {
        setProblem({ kind: 'error', message: msg.message });
      } else if (msg.type === 'blocked') {
        setProblem({ kind: 'blocked' });
      }
    };
    window.addEventListener('message', onMessage);
    // If the page stops reporting in, take it away.
    const watchdog = setInterval(() => {
      if (Date.now() - lastBeat.current > HEARTBEAT_TIMEOUT_MS) {
        setRun(null);
        setProblem({ kind: 'unresponsive' });
      }
    }, 1000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(watchdog);
    };
  }, [run]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-4 py-2">
        <h2 className="font-extrabold">Preview</h2>
        <Button size="sm" onClick={start}>
          {run ? 'Run again' : 'Run'}
        </Button>
      </div>
      <div className="flex min-h-48 flex-1 flex-col bg-white">
        {run ? (
          <iframe
            key={run.nonce}
            ref={frameRef}
            title="Project preview"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={run.srcDoc}
            className="w-full flex-1 border-0"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="text-5xl" aria-hidden="true">
              🚀
            </span>
            <p className="text-lg font-bold">Press Run to see your project</p>
            <p className="text-ink-600">Nothing runs until you press Run.</p>
          </div>
        )}
      </div>
      {problem && <ProblemAlert problem={problem} />}
      {logs.length > 0 && (
        <section
          aria-label="Messages"
          className="max-h-32 overflow-auto border-t border-ink-200 p-3"
        >
          <h3 className="text-sm font-extrabold">Messages from your project</h3>
          <ul className="font-mono text-sm">
            {logs.map((l, i) => (
              <li key={i} className={l.level === 'error' ? 'text-coral-700' : undefined}>
                {l.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProblemAlert({ problem }) {
  const text = {
    error: `Your code hit a problem: ${problem.message}`,
    blocked: "Your project tried to reach the internet, which isn't allowed here.",
    unresponsive:
      "Your project stopped because it wasn't responding. Check for a loop that never ends.",
    missing: "We couldn't find index.html, so there is nothing to show yet.",
  }[problem.kind];
  return (
    <Alert
      tone={problem.kind === 'error' || problem.kind === 'unresponsive' ? 'warning' : 'info'}
      className="m-3"
    >
      {text}
    </Alert>
  );
}
