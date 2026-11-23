import { useState } from 'react';
import { Alert, Button, Card, SelectField, Spinner } from '../../components/ui/index.js';
import { ApiError, apiRequest } from '../../services/apiClient.js';
import { LANGUAGES } from '../prompt-studio/promptStudioData.js';

const IDEAS = ['Make the background blue', 'Make the title bigger', 'Change the button colour'];
const INSTRUCTION_MAX = 500;

const errorText = (err) => {
  if (err instanceof ApiError) {
    if (err.code === 'VERSION_OUTDATED') {
      return {
        text: 'This project has a newer version. Open it again to keep going.',
        reload: true,
      };
    }
    if (['EXPERIMENT_LIMIT_REACHED', 'PROJECT_VERSION_LIMIT'].includes(err.code)) {
      return { text: err.message };
    }
    if (err.status === 429) return { text: 'Lots of changes! Please wait a little and try again.' };
    if (err.status === 401) {
      return { text: 'Your visit has ended. Please start again from the home page.' };
    }
  }
  return { text: "We couldn't make that change just now. Please try again." };
};

// Experiment Mode: describe a change in words and get a NEW version of the project. The server
// changes the saved code; earlier versions are kept. Unsaved edits are not part of an experiment.
export default function ExperimentPanel({ experiment, edited, onOpen, onReload }) {
  const [language, setLanguage] = useState(experiment?.defaultLanguage ?? 'en');
  const [text, setText] = useState('');
  const [state, setState] = useState({ status: 'idle' }); // idle | sending | ok | note | error

  if (!experiment) {
    return (
      <Card className="mt-4">
        <h2 className="text-xl font-extrabold">Try a change</h2>
        <p className="mt-1 text-ink-600">Open a saved project to try changes.</p>
      </Card>
    );
  }

  const busy = state.status === 'sending';
  const go = async (raw) => {
    const instruction = raw.trim();
    if (!instruction || busy || edited) return;
    setState({ status: 'sending' });
    try {
      const data = await apiRequest(`/projects/${experiment.projectId}/experiments`, {
        method: 'POST',
        body: { baseVersionId: experiment.versionId, instruction, language },
        childId: experiment.childId,
        guestToken: experiment.guestToken,
      });
      if (data.status === 'ok') {
        setState({ status: 'ok', result: data });
        setText('');
      } else {
        setState({ status: 'note', message: data.message });
      }
    } catch (err) {
      setState({ status: 'error', ...errorText(err) });
    }
  };

  const result = state.result;
  return (
    <Card className="mt-4" aria-labelledby="experiment-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="experiment-title" className="text-xl font-extrabold">
            Try a change
          </h2>
          <p className="text-sm text-ink-600">
            Say what you want to change. You get a new version, and your earlier version stays safe.
          </p>
        </div>
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
      </div>

      {edited && (
        <Alert tone="info" className="mt-3">
          A change is made from your saved project. Reset your unsaved changes first.
        </Alert>
      )}

      <ul aria-label="Change ideas" className="mt-3 flex flex-wrap gap-2">
        {IDEAS.map((idea) => (
          <li key={idea}>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy || edited}
              onClick={() => go(idea)}
            >
              {idea}
            </Button>
          </li>
        ))}
      </ul>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
      >
        <label htmlFor="experiment-text" className="block text-sm font-bold text-ink-700">
          What do you want to change?
        </label>
        <textarea
          id="experiment-text"
          rows={2}
          maxLength={INSTRUCTION_MAX}
          value={text}
          disabled={busy || edited}
          onChange={(e) => setText(e.target.value)}
          className="mt-1 w-full rounded-xl border-2 border-ink-200 p-3 hover:border-ink-300"
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-ink-600">
            {text.length}/{INSTRUCTION_MAX}
          </span>
          <Button type="submit" disabled={busy || edited || !text.trim()}>
            Try it
          </Button>
        </div>
      </form>

      <div aria-live="polite">
        {busy && (
          <p className="mt-3 flex items-center gap-2 font-semibold text-ink-600">
            <Spinner label="" /> Making your change…
          </p>
        )}
        {state.status === 'note' && (
          <Alert tone="info" className="mt-3">
            {state.message}
          </Alert>
        )}
        {state.status === 'error' && (
          <Alert tone="warning" className="mt-3">
            {state.text}{' '}
            {state.reload && (
              <Button size="sm" onClick={onReload}>
                Open it again
              </Button>
            )}
          </Alert>
        )}
        {state.status === 'ok' && (
          <div className="mt-3">
            <Alert tone="success">
              Done! This is version {result.version.versionNumber}. Your earlier version is safe.
            </Alert>
            <h3 className="mt-3 text-sm font-extrabold text-ink-700">What changed</h3>
            <ul className="mt-1 space-y-1">
              {result.changedFiles.map((c) => (
                <li key={c.path}>
                  <span className="font-mono font-bold">{c.path}</span>:{' '}
                  {c.summary[language] ?? c.summary.en}
                </li>
              ))}
            </ul>
            <Button className="mt-3" onClick={() => onOpen(result)}>
              Open the new version
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
