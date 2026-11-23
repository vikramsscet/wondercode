import { useEffect, useState } from 'react';
import { Alert, Badge, Button } from '../../components/ui/index.js';
import { cn } from '../../utils/cn.js';
import { clearDraft, loadDraft, saveDraft } from './drafts.js';
import ExplainPanel from './ExplainPanel.jsx';
import EditorPane from './EditorPane.jsx';
import FileExplorer from './FileExplorer.jsx';
import { MOCK_PROJECT } from './mockProject.js';
import PreviewPane from './PreviewPane.jsx';

const TABS = [
  { id: 'files', label: 'Files' },
  { id: 'code', label: 'Code' },
  { id: 'preview', label: 'Preview' },
];

// Three panes: files | code | preview. From the lg breakpoint they sit side by side; on smaller
// screens a tab bar shows one at a time (all stay mounted so nothing resets when switching).
export default function Workspace({ files, title, version, checked, draftKey, explain }) {
  const sample = !files;
  const project = sample ? MOCK_PROJECT : { title, files };
  const [activePath, setActivePath] = useState(project.files[0]?.path);
  const [tab, setTab] = useState('code');
  const [edits, setEdits] = useState({}); // path -> edited text; the originals are never changed
  const [selection, setSelection] = useState(null); // { path, startLine, endLine }, line numbers only
  // A draft from an earlier visit is offered, never applied silently.
  const [pending, setPending] = useState(() =>
    draftKey ? loadDraft(draftKey, project.files) : null,
  );
  const dirtyCount = Object.keys(edits).length;

  useEffect(() => {
    if (!draftKey || pending) return undefined;
    const timer = setTimeout(() => saveDraft(draftKey, edits), 500);
    return () => clearTimeout(timer);
  }, [draftKey, edits, pending]);

  useEffect(() => {
    if (dirtyCount === 0) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyCount]);

  const restore = () => {
    setEdits(pending);
    setPending(null);
  };
  const discard = () => {
    clearDraft(draftKey);
    setPending(null);
  };
  const resetFile = (path) =>
    setEdits((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  const file = project.files.find((f) => f.path === activePath);
  const show = (id) => (tab === id ? 'block' : 'hidden lg:block');
  const select = (path) => {
    setActivePath(path);
    setTab('code');
  };

  return (
    <section aria-labelledby="workspace-title">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 id="workspace-title" className="text-3xl font-extrabold text-brand-800">
          {project.title}
        </h1>
        {sample && <Badge tone="sun">Sample</Badge>}
        {version && <Badge tone="mint">{`Version ${version}${checked ? ', checked' : ''}`}</Badge>}
      </div>
      {pending && (
        <Alert tone="info" className="mb-3">
          We found changes you hadn't saved ({Object.keys(pending).length} file
          {Object.keys(pending).length === 1 ? '' : 's'}).
          <span className="ml-3 inline-flex gap-2">
            <Button size="sm" onClick={restore}>
              Restore
            </Button>
            <Button size="sm" variant="outline" onClick={discard}>
              Throw away
            </Button>
          </span>
        </Alert>
      )}
      {dirtyCount > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {file && file.path in edits && (
            <Button size="sm" variant="outline" onClick={() => resetFile(file.path)}>
              Reset this file
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setEdits({})}>
            Reset all changes
          </Button>
        </div>
      )}
      <div role="tablist" aria-label="Workspace panes" className="mb-3 flex gap-2 lg:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`pane-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              'min-h-11 flex-1 rounded-full px-4 font-bold',
              tab === t.id ? 'bg-brand-600 text-white' : 'bg-ink-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)_minmax(0,1fr)] lg:h-[70vh]">
        <div
          id="pane-files"
          role="region"
          aria-label="Files pane"
          className={cn('rounded-card bg-white p-3 shadow-soft lg:overflow-auto', show('files'))}
        >
          <FileExplorer files={project.files} activePath={activePath} onSelect={select} />
        </div>
        <div
          id="pane-code"
          role="region"
          aria-label="Code pane"
          className={cn(
            'min-h-[50vh] overflow-hidden rounded-card bg-white shadow-soft',
            show('code'),
          )}
        >
          <EditorPane
            file={file}
            value={file ? (edits[file.path] ?? file.content) : ''}
            dirty={Boolean(file) && file.path in edits}
            selection={selection}
            onChange={(text) =>
              setEdits((prev) => {
                const next = { ...prev };
                if (text === file.content) delete next[file.path];
                else next[file.path] = text;
                return next;
              })
            }
            onSelection={setSelection}
          />
        </div>
        <div
          id="pane-preview"
          role="region"
          aria-label="Preview pane"
          className={cn(
            'min-h-[50vh] overflow-hidden rounded-card bg-white shadow-soft',
            show('preview'),
          )}
        >
          <PreviewPane
            files={project.files.map((f) => ({
              path: f.path,
              content: edits[f.path] ?? f.content,
            }))}
            onStart={() => setTab('preview')}
          />
        </div>
      </div>
      <ExplainPanel
        explain={explain}
        file={file}
        edited={Boolean(file) && file.path in edits}
        selection={selection}
      />
    </section>
  );
}
