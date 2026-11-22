import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPreviewDocument } from './buildPreviewDocument.js';
import {
  HEARTBEAT_TIMEOUT_MS,
  MAX_LOG_CHARS,
  MAX_LOG_LINES,
  MAX_MESSAGES,
  MAX_PER_SECOND,
  MAX_RUN_MS,
  START_TIMEOUT_MS,
  acceptMessage,
  newNonce,
} from './previewProtocol.js';

// Run state: idle -> starting -> running -> stopped. A problem (error, blocked, ...) may sit on top.
// problem.kind: error | blocked | missing | unresponsive | startTimeout | timeLimit
const keyOf = (files) => JSON.stringify(files.map((f) => [f.path, f.content]));

// frameRef is created by the component and attached to the iframe, so the hook can check senders.
export function usePreviewRunner(files, frameRef) {
  const [status, setStatus] = useState('idle');
  const [run, setRun] = useState(null); // { nonce, srcDoc, key }
  const [logs, setLogs] = useState([]); // { level, text, count }
  const [problem, setProblem] = useState(null);
  const [hidden, setHidden] = useState(false); // some messages were dropped
  const statusRef = useRef('idle');
  const t = useRef({ started: 0, beat: 0, total: 0, windowStart: 0, windowCount: 0 });

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const halt = useCallback((nextProblem = null) => {
    setRun(null);
    setStatus('stopped');
    setProblem(nextProblem);
  }, []);

  const start = useCallback(() => {
    const nonce = newNonce();
    const srcDoc = buildPreviewDocument(files, nonce);
    setLogs([]);
    setHidden(false);
    t.current = { started: Date.now(), beat: Date.now(), total: 0, windowStart: 0, windowCount: 0 };
    if (!srcDoc) {
      setRun(null);
      setStatus('stopped');
      setProblem({ kind: 'missing' });
      return;
    }
    setProblem(null);
    setStatus('starting');
    setRun({ nonce, srcDoc, key: keyOf(files) });
  }, [files]);

  const stop = useCallback(() => halt(null), [halt]);

  useEffect(() => {
    if (!run) return undefined;
    const onMessage = (event) => {
      const msg = acceptMessage(event, frameRef.current?.contentWindow, run.nonce);
      if (!msg) return;
      const now = Date.now();
      t.current.beat = now; // any valid message proves the page is alive
      if (msg.type === 'ready') return setStatus('running');
      if (msg.type === 'heartbeat') return setStatus((s) => (s === 'starting' ? 'running' : s));
      // Everything else is rate limited and capped so a noisy project cannot flood the app.
      const w = t.current;
      if (now - w.windowStart >= 1000) Object.assign(w, { windowStart: now, windowCount: 0 });
      if (++w.windowCount > MAX_PER_SECOND || ++w.total > MAX_MESSAGES) return setHidden(true);
      if (msg.type === 'log') {
        setLogs((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.level === msg.level && last.text === msg.text) {
            return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
          }
          const next = [...prev, { level: msg.level, text: msg.text, count: 1 }].slice(
            -MAX_LOG_LINES,
          );
          let chars = next.reduce((n, l) => n + l.text.length, 0);
          while (chars > MAX_LOG_CHARS && next.length > 1) chars -= next.shift().text.length;
          return next;
        });
      } else if (msg.type === 'error') {
        setProblem({ kind: 'error', message: msg.message });
      } else if (msg.type === 'blocked') {
        setProblem({ kind: 'blocked' });
      }
    };
    window.addEventListener('message', onMessage);
    const watchdog = setInterval(() => {
      const now = Date.now();
      const { started, beat } = t.current;
      if (now - started > MAX_RUN_MS) halt({ kind: 'timeLimit' });
      else if (statusRef.current === 'starting' && now - started > START_TIMEOUT_MS) {
        halt({ kind: 'startTimeout' });
      } else if (now - beat > HEARTBEAT_TIMEOUT_MS) {
        halt({ kind: 'unresponsive' });
      }
    }, 1000);
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(watchdog);
    };
  }, [run, halt, frameRef]);

  const changed = useMemo(() => Boolean(run) && run.key !== keyOf(files), [run, files]);

  return { status, run, logs, problem, hidden, changed, start, stop };
}
