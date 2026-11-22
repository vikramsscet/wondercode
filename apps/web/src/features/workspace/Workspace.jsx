import { useState } from 'react';
import { Badge } from '../../components/ui/index.js';
import { cn } from '../../utils/cn.js';
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
export default function Workspace({ files, title }) {
  const sample = !files;
  const project = sample ? MOCK_PROJECT : { title, files };
  const [activePath, setActivePath] = useState(project.files[0]?.path);
  const [tab, setTab] = useState('code');
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
      </div>
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
          <EditorPane file={file} />
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
          <PreviewPane />
        </div>
      </div>
    </section>
  );
}
