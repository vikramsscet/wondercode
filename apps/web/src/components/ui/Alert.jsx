import { cn } from '../../utils/cn.js';

const tones = {
  info: 'bg-brand-100 text-brand-800',
  success: 'bg-mint-100 text-mint-700',
  warning: 'bg-sun-100 text-sun-800',
  error: 'bg-coral-100 text-coral-700',
};

// Errors are announced immediately (role=alert); other tones politely (role=status).
export default function Alert({ tone = 'info', className, children }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('rounded-xl px-4 py-3 text-sm font-semibold', tones[tone], className)}
    >
      {children}
    </div>
  );
}
