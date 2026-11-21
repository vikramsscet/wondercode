import { useId } from 'react';
import { cn } from '../../utils/cn.js';

export default function SelectField({
  label,
  hint,
  error,
  className,
  id,
  children,
  ...selectProps
}) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="block text-sm font-bold text-ink-700">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className={cn(
          'mt-1 min-h-11 w-full rounded-xl border-2 bg-white px-3 py-2 text-ink-900',
          error ? 'border-coral-600' : 'border-ink-200 hover:border-ink-300',
        )}
        {...selectProps}
      >
        {children}
      </select>
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
