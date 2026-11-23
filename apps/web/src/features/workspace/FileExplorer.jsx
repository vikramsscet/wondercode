import { useRef } from 'react';
import { cn } from '../../utils/cn.js';

const ICONS = { html: '🌐', css: '🎨', js: '⚡' };
const iconFor = (path) => ICONS[path.split('.').pop()] ?? '📄';

// List of project files. Up/Down/Home/End move between files; the active one has aria-current.
export default function FileExplorer({ files, activePath, onSelect, changed }) {
  const refs = useRef([]);
  const onKeyDown = (e, i) => {
    const last = files.length - 1;
    const next = {
      ArrowDown: Math.min(i + 1, last),
      ArrowUp: Math.max(i - 1, 0),
      Home: 0,
      End: last,
    }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onSelect(files[next].path);
  };
  return (
    <nav aria-label="Project files">
      <h2 className="px-3 pb-2 text-sm font-extrabold uppercase tracking-wide text-ink-500">
        Files
      </h2>
      <ul>
        {files.map((f, i) => (
          <li key={f.path}>
            <button
              type="button"
              ref={(el) => (refs.current[i] = el)}
              aria-current={f.path === activePath ? 'true' : undefined}
              onClick={() => onSelect(f.path)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left font-semibold',
                f.path === activePath ? 'bg-brand-100 text-brand-800' : 'hover:bg-ink-100',
              )}
            >
              <span aria-hidden="true">{iconFor(f.path)}</span>
              {f.path}
              {changed?.has(f.path) && (
                <span className="ml-auto rounded-full bg-sun-100 px-2 text-xs font-bold text-sun-800">
                  changed
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
