import { useState } from 'react';
import { Alert, Badge, Button, Card, SelectField, Spinner } from '../../components/ui/index.js';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import { LANGUAGES } from '../prompt-studio/promptStudioData.js';

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const errorText = (err) => {
  if (err instanceof ApiError) {
    if (err.status === 409 && err.code === 'EXPLANATION_STALE') {
      return 'This code has changed. Select the lines again to get a fresh explanation.';
    }
    if (err.status === 422) return err.message;
    if (err.status === 429) return 'Lots of questions! Please wait a little and try again.';
    if (err.status === 401) return 'Your visit has ended. Please start again from the home page.';
  }
  return "We couldn't explain that just now. Please try again.";
};

// Explains the selected lines of the SAVED code. Unsaved edits are never sent or explained:
// the server checks the saved file and the hash of exactly these lines.
export default function ExplainPanel({ explain, file, edited, selection }) {
  const [language, setLanguage] = useState(explain?.defaultLanguage ?? 'en');
  const [state, setState] = useState({ key: null }); // { key, status, data | message }

  if (!explain) {
    return (
      <Card className="mt-4">
        <h2 className="text-xl font-extrabold">Explain my code</h2>
        <p className="mt-1 text-ink-600">Open a saved project to get explanations.</p>
      </Card>
    );
  }

  const lines = file ? file.content.split('\n') : [];
  const range =
    file && selection?.path === file.path
      ? { start: selection.startLine, end: Math.min(selection.endLine, lines.length) }
      : null;
  const key = range ? `${file.path}:${range.start}:${range.end}:${language}` : null;
  const current = state.key === key ? state : { status: 'idle' };

  let blocker = null;
  if (!file) blocker = 'Pick a file first.';
  else if (edited) {
    blocker = 'Explanations are about your saved code. Reset your changes to this file first.';
  } else if (!range) blocker = 'Click or select some lines in the code first.';

  const ask = async () => {
    setState({ key, status: 'loading' });
    try {
      const snippet = lines.slice(range.start - 1, range.end).join('\n');
      const data = await apiRequest(`/projects/${explain.projectId}/explanations`, {
        method: 'POST',
        body: {
          versionId: explain.versionId,
          filePath: file.path,
          lineStart: range.start,
          lineEnd: range.end,
          codeHash: await sha256Hex(snippet),
          explanationLanguage: language,
        },
        childId: explain.childId,
        guestToken: explain.guestToken,
      });
      setState((s) => (s.key === key ? { key, status: 'done', data } : s));
    } catch (err) {
      setState((s) => (s.key === key ? { key, status: 'error', message: errorText(err) } : s));
    }
  };

  const d = current.data;
  return (
    <Card className="mt-4" aria-labelledby="explain-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="explain-title" className="text-xl font-extrabold">
          Explain my code
        </h2>
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
          <Button onClick={ask} disabled={Boolean(blocker) || current.status === 'loading'}>
            {range && !blocker
              ? `Explain ${range.start === range.end ? `line ${range.start}` : `lines ${range.start} to ${range.end}`}`
              : 'Explain these lines'}
          </Button>
        </div>
      </div>
      {blocker && <p className="mt-3 text-ink-600">{blocker}</p>}
      <div aria-live="polite">
        {current.status === 'loading' && (
          <p className="mt-3 flex items-center gap-2 font-semibold text-ink-600">
            <Spinner label="" /> Thinking about your code…
          </p>
        )}
        {current.status === 'error' && (
          <Alert tone="warning" className="mt-3">
            {current.message}
          </Alert>
        )}
        {current.status === 'done' && (
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{d.concept}</Badge>
              {d.isMock && <Badge tone="sun">Sample explanation</Badge>}
              <span className="text-sm text-ink-600">
                {file.path},{' '}
                {range.start === range.end
                  ? `line ${range.start}`
                  : `lines ${range.start} to ${range.end}`}
              </span>
            </div>
            <p className="mt-2 text-lg">{d.explanation[language]}</p>
            <p className="mt-2 text-ink-700">{d.realLifeExample[language]}</p>
            <p className="mt-2 font-bold text-brand-800">Try this: {d.tryThis}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
