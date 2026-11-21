import { cn } from '../../utils/cn.js';

export default function Card({ as: Tag = 'div', tone = 'white', className, children, ...rest }) {
  const tones = {
    white: 'bg-white',
    brand: 'bg-brand-50 border border-brand-100',
    sun: 'bg-sun-100',
  };
  return (
    <Tag className={cn('rounded-card p-6 shadow-soft', tones[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}
