// What the sandboxed preview may tell the parent. Everything else is dropped.
export const MAX_MESSAGES = 200; // per run
export const MAX_TEXT = 500; // characters per message
export const MAX_LOG_LINES = 50; // kept for display
export const MAX_PER_SECOND = 30; // non-heartbeat messages
export const MAX_LOG_CHARS = 20000; // total console text kept
export const HEARTBEAT_TIMEOUT_MS = 5000;
export const START_TIMEOUT_MS = 5000; // time allowed to say "ready"
export const MAX_RUN_MS = 10 * 60 * 1000; // a run is stopped after 10 minutes

const LEVELS = ['log', 'info', 'warn', 'error'];
const clip = (v) => String(v ?? '').slice(0, MAX_TEXT);
const position = (v) => (Number.isInteger(v) && v >= 1 && v <= 1_000_000 ? v : undefined);

// Returns a clean { type, ... } message, or null if the event must be ignored.
// A sandbox without allow-same-origin has the opaque origin "null".
export function acceptMessage(event, frameWindow, nonce) {
  if (!frameWindow || event.source !== frameWindow) return null;
  if (event.origin !== 'null') return null;
  const m = event.data;
  if (!m || typeof m !== 'object' || m.n !== nonce) return null;
  switch (m.t) {
    case 'ready':
    case 'heartbeat':
    case 'blocked':
      return { type: m.t };
    case 'log':
      return {
        type: 'log',
        level: LEVELS.includes(m.d?.level) ? m.d.level : 'log',
        text: clip(m.d?.text),
      };
    case 'error':
      return {
        type: 'error',
        message: clip(m.d?.message),
        ...(/^[A-Za-z]{1,30}$/.test(m.d?.name ?? '') && { name: m.d.name }),
        ...(position(m.d?.line) && { line: m.d.line }),
        ...(position(m.d?.column) && { column: m.d.column }),
      };
    default:
      return null;
  }
}

export function newNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
