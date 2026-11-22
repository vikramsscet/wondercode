// Placeholder preview. The sandboxed iframe arrives in Prompt 22; nothing is run here.
export default function PreviewPane() {
  return (
    <div className="flex h-full flex-col">
      <h2 className="border-b border-ink-200 px-4 py-2 font-extrabold">Preview</h2>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-5xl" aria-hidden="true">
          🚀
        </span>
        <p className="text-lg font-bold">Your project will appear here</p>
        <p className="text-ink-600">Running projects is coming soon. Nothing has been run yet.</p>
      </div>
    </div>
  );
}
