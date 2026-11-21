import { cn } from '../../utils/cn.js';

const sizes = { sm: 'size-4 border-2', md: 'size-8 border-4', lg: 'size-12 border-4' };

// Decorative when label is empty (e.g. inside a button that already says what is happening).
export default function Spinner({ size = 'md', label = 'Loading', className }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-hidden={label ? undefined : true}
      className={cn('inline-flex items-center gap-2', className)}
    >
      <span
        className={cn(
          'inline-block animate-spin rounded-full border-current border-t-transparent',
          sizes[size],
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function LoadingState({ message = 'Getting things ready…' }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-12 text-brand-700">
      <Spinner size="lg" label="" />
      <p className="font-semibold text-ink-600">{message}</p>
    </div>
  );
}

// Placeholder block for content that is loading.
export function Skeleton({ className }) {
  return (
    <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-ink-200', className)} />
  );
}
