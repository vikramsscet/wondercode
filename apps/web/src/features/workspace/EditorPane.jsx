import { Suspense, lazy } from 'react';

// Monaco is large, so it loads on demand and stays out of the dashboard bundle.
const MonacoEditor = lazy(() => import('./MonacoEditor.jsx'));

const rangeText = ({ startLine, endLine }) =>
  startLine === endLine ? `Line ${startLine}` : `Lines ${startLine} to ${endLine}`;

// The code editor for one file. Edits stay in the browser; nothing is saved or run here.
export default function EditorPane({ file, value, dirty, selection, onChange, onSelection }) {
  if (!file) return <p className="p-4 text-ink-600">Pick a file to see its code.</p>;
  return (
    <div className="flex h-full flex-col">
      <h2 className="flex items-center gap-2 border-b border-ink-200 px-4 py-2 font-extrabold">
        {file.path}
        {dirty && <span className="text-sm font-semibold text-sun-800">Changed, not saved</span>}
      </h2>
      <div className="min-h-64 flex-1 bg-ink-900" role="group" aria-label={`Code of ${file.path}`}>
        <Suspense fallback={<p className="p-4 text-white">Loading your editor…</p>}>
          <MonacoEditor
            path={file.path}
            value={value}
            onChange={onChange}
            onSelection={(s) => onSelection({ path: file.path, ...s })}
          />
        </Suspense>
      </div>
      <p className="border-t border-ink-200 px-4 py-1 text-sm text-ink-600" aria-live="polite">
        {selection?.path === file.path ? rangeText(selection) : 'Click in the code to pick a line'}
      </p>
    </div>
  );
}
