import { useEffect, useId, useRef } from 'react';
import Button from './Button.jsx';

// Modal built on the native <dialog>: focus is trapped, Esc closes it, and focus returns to the opener.
export default function Dialog({ open, onClose, title, children, closeLabel = 'Close', actions }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault(); // we control `open`
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card bg-white p-6 shadow-soft"
    >
      <h2 id={titleId} className="text-xl font-extrabold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        {actions}
        <Button variant="secondary" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </dialog>
  );
}
