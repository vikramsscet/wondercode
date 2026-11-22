// Placeholder editor: read-only code with line numbers. Monaco replaces the <pre> in Prompt 21.
export default function EditorPane({ file }) {
  if (!file) return <p className="p-4 text-ink-600">Pick a file to see its code.</p>;
  const lines = file.content.replace(/\n$/, '').split('\n');
  return (
    <div className="flex h-full flex-col">
      <h2 className="border-b border-ink-200 px-4 py-2 font-extrabold">{file.path}</h2>
      <pre
        tabIndex={0}
        aria-label={`Code of ${file.path}`}
        className="flex-1 overflow-auto bg-ink-900 p-4 font-mono text-sm leading-6 text-white"
      >
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span
              aria-hidden="true"
              className="w-8 shrink-0 select-none pr-3 text-right text-ink-400"
            >
              {i + 1}
            </span>
            <code className="whitespace-pre-wrap break-all">{line || ' '}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
