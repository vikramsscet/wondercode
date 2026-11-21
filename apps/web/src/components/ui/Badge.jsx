import { cn } from '../../utils/cn.js';

const tones = {
  brand: 'bg-brand-100 text-brand-800',
  sun: 'bg-sun-100 text-sun-800',
  mint: 'bg-mint-100 text-mint-700',
  coral: 'bg-coral-100 text-coral-700',
};

// Small label, e.g. "Sample response" for mock AI output.
export default function Badge({ tone = 'brand', className, children }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-3 py-0.5 text-xs font-bold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
