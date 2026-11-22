// What the sandboxed preview may tell the parent. Everything else is dropped.
export const MAX_MESSAGES = 200; // per run
export const MAX_TEXT = 500; // characters per message
export const MAX_LOG_LINES = 50; // kept for display
export const HEARTBEAT_TIMEOUT_MS = 5000;

const LEVELS = ['log', 'info', 'warn', 'error'];
const clip = (v) => String(v ?? '').slice(0, MAX_TEXT);

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
      return { type: 'error', message: clip(m.d?.message) };
    default:
      return null;
  }
}

export function newNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
