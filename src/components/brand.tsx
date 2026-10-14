import { cn } from '~/lib/utils';

/** The NoteNest mark: a woven nest cradling a single note. */
export function NoteNestMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 32 32'
      aria-hidden='true'
      className={cn('size-7 shrink-0', className)}
    >
      <rect width='32' height='32' rx='8.5' fill='var(--primary)' />
      <path
        d='M9.5 9.5h9.2l3.8 3.8v6.2'
        fill='none'
        stroke='var(--primary-foreground)'
        strokeWidth='1.7'
        strokeLinecap='round'
        strokeLinejoin='round'
        opacity='.55'
      />
      <path
        d='M7 17.2c0 4.3 4 7.3 9 7.3s9-3 9-7.3'
        fill='none'
        stroke='var(--primary-foreground)'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M9.6 20.4c3.9 1.3 8.9 1.3 12.8 0'
        fill='none'
        stroke='var(--primary-foreground)'
        strokeWidth='1.5'
        strokeLinecap='round'
        opacity='.7'
      />
    </svg>
  );
}

export function NoteNestLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <NoteNestMark />
      <span className='font-serif text-[19px] font-semibold tracking-[-0.01em] text-foreground'>
        NoteNest
      </span>
    </span>
  );
}
