import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
// Editor features (find, bracket matching, folding...) and syntax highlighting only. The
// HTML/CSS/JS language *services* (validation, suggestions) are deliberately not loaded:
// our server-side validator is the single source of truth (ADR 0020).
import 'monaco-editor/esm/vs/editor/editor.all';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// Bundle Monaco locally: never fetch it from a CDN.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

const LANGUAGES = { html: 'html', css: 'css', js: 'javascript' };
export const languageFor = (path) => LANGUAGES[path.split('.').pop()] ?? 'plaintext';

const OPTIONS = {
  minimap: { enabled: false },
  lineNumbers: 'on',
  wordWrap: 'on',
  fontSize: 16,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  accessibilitySupport: 'auto',
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  links: false,
  contextmenu: false,
};

// One Monaco model per file path, so undo history and cursor survive file switching.
export default function MonacoEditor({ path, value, onChange, onSelection }) {
  return (
    <Editor
      path={path}
      language={languageFor(path)}
      value={value}
      theme="vs-dark"
      options={OPTIONS}
      loading={<p className="p-4 text-white">Loading your editor…</p>}
      onChange={(v) => onChange(v ?? '')}
      onMount={(editor) => {
        const report = () => {
          const s = editor.getSelection();
          if (s) onSelection({ startLine: s.startLineNumber, endLine: s.endLineNumber });
        };
        report();
        editor.onDidChangeCursorSelection(report);
      }}
    />
  );
}
