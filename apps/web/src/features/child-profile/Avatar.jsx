import { cn } from '../../utils/cn.js';
import { getAvatar } from './avatars.js';

const sizes = { sm: 'size-9 text-xl', md: 'size-14 text-3xl', lg: 'size-24 text-6xl' };

// Decorative: the child's name is always shown next to it.
export default function Avatar({ avatarKey, size = 'md', className }) {
  const avatar = getAvatar(avatarKey);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        avatar.background,
        sizes[size],
        className,
      )}
    >
      {avatar.emoji}
    </span>
  );
}
