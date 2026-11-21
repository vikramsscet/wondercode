import { useId } from 'react';
import { cn } from '../../utils/cn.js';

// Labelled input with optional hint and error, wired up for screen readers.
export default function TextField({ label, hint, error, className, id, ...inputProps }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-bold text-ink-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'mt-1 min-h-11 w-full rounded-xl border-2 bg-white px-4 py-2 text-ink-900 placeholder:text-ink-500',
          error ? 'border-coral-600' : 'border-ink-200 hover:border-ink-300',
        )}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-ink-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}
    </div>
  );
}
