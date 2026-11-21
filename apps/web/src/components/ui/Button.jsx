import { cn } from '../../utils/cn.js';
import Spinner from './Spinner.jsx';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-bold transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const variants = {
  primary: 'bg-brand-600 text-white shadow-soft hover:bg-brand-700',
  secondary: 'bg-brand-100 text-brand-800 hover:bg-brand-200',
  outline: 'border-2 border-ink-200 bg-white text-ink-900 hover:bg-ink-100',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-coral-600 text-white hover:bg-coral-700',
};

const sizes = {
  sm: 'px-4 text-sm',
  md: 'px-6 text-base',
  lg: 'min-h-14 px-8 text-lg',
};

// Also usable on links: <Link className={buttonClasses({ variant: 'primary' })} />
export const buttonClasses = ({ variant = 'primary', size = 'md', className } = {}) =>
  cn(base, variants[variant], sizes[size], className);

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...rest}
    >
      {loading && <Spinner size="sm" label="" />}
      {children}
    </button>
  );
}
