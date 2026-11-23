// The browser re-checks every visual before drawing it (the API already validated it). Only the
// known shape survives: unknown fields are dropped, text is clamped, broken parts are removed,
// and anything unusable gives null. Text is only ever drawn as text, never as HTML.
export const LANGS = ['en', 'hi', 'hinglish'];
const ID = /^[a-z0-9_]{1,20}$/;
const KINDS = ['start', 'step', 'decision', 'end'];

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

// { en, hi?, hinglish? }: English is required, the others fall back to it when drawn.
function localized(v, max) {
  const en = str(v?.en, max);
  if (!en) return null;
  const out = { en };
  for (const lang of ['hi', 'hinglish']) {
    const s = str(v[lang], max);
    if (s) out[lang] = s;
  }
  return out;
}

function parseFlow(raw) {
  if (!Array.isArray(raw?.nodes)) return null;
  const nodes = [];
  for (const n of raw.nodes.slice(0, 8)) {
    const text = localized(n?.text, 80);
    if (!text || !KINDS.includes(n?.kind) || !ID.test(n?.id ?? '')) return null;
    nodes.push({
      id: n.id,
      kind: n.kind,
      text,
      ...(ID.test(n.next ?? '') && { next: n.next }),
      ...(ID.test(n.yes ?? '') && { yes: n.yes }),
      ...(ID.test(n.no ?? '') && { no: n.no }),
    });
  }
  const ids = nodes.map((n) => n.id);
  if (nodes.length < 2 || new Set(ids).size !== ids.length) return null;
  for (const n of nodes) {
    const targets = [n.next, n.yes, n.no].filter(Boolean);
    if (targets.some((t) => !ids.includes(t))) return null;
    if (n.kind === 'decision' && !(n.yes && n.no)) return null;
  }
  return { nodes };
}

export function parseVisual(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = localized(raw.title, 80);
  if (!title) return null;
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .slice(0, 8)
        .map((s) => localized(s, 120))
        .filter(Boolean)
    : [];
  const flow = parseFlow(raw.flow);
  const examples = Array.isArray(raw.examples)
    ? raw.examples
        .slice(0, 4)
        .map((e) => ({ input: str(e?.input, 60), output: str(e?.output, 60) }))
        .filter((e) => e.input && e.output)
    : [];
  const out = {
    title,
    ...(steps.length >= 2 && { steps }),
    ...(flow && { flow }),
    ...(examples.length > 0 && { examples }),
  };
  return out.steps || out.flow || out.examples ? out : null;
}
