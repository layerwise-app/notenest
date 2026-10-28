import { cn } from '~/lib/utils';

/**
 * The NoteNest mark: a page nested in a page, on an ink tile. The tile uses the
 * foreground color and the glyph the background color, so it flips in dark mode.
 */
export function NoteNestMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 32 32' aria-hidden='true' className={cn('size-7 shrink-0', className)}>
      <rect width='32' height='32' rx='7.5' fill='var(--foreground)' />
      <path
        d='M8 21.5v-14h9l4 4'
        fill='none'
        stroke='var(--background)'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
        opacity='.55'
      />
      <path
        d='M12 11h7l4 4v9.5H12z'
        fill='var(--background)'
        stroke='var(--background)'
        strokeWidth='1.2'
        strokeLinejoin='round'
      />
      <path d='M18.6 11.4v4h4' fill='none' stroke='var(--foreground)' strokeWidth='1.3' strokeLinejoin='round' />
    </svg>
  );
}

export function NoteNestLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <NoteNestMark />
      <span className='text-[17px] font-semibold tracking-[-0.015em] text-foreground'>NoteNest</span>
    </span>
  );
}
