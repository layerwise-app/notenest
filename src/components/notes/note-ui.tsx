import type * as React from 'react';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { cn } from '~/lib/utils';

// Small pieces shared across the notebook panes.

type IconButtonProps = React.ComponentProps<typeof Button> & {
  label: string;
  shortcut?: string;
  active?: boolean;
};

/** Ghost icon button with an accessible label and a tooltip showing its shortcut. */
export function IconButton({ label, shortcut, active, className, children, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            active && 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground',
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom'>
        {label}
        {shortcut ? <span className='ml-1 opacity-60'>{shortcut}</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block max-w-28 truncate rounded-full bg-accent px-1.5 py-[3px] text-[11px] leading-none font-medium text-accent-foreground',
        className
      )}
    >
      #{tag}
    </span>
  );
}

export function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <span
      className='inline-flex shrink-0 items-center gap-1.5 text-[11.5px] text-muted-foreground tabular-nums'
      aria-label={`${done} of ${total} tasks done`}
    >
      <span className='relative h-1 w-8 overflow-hidden rounded-full bg-border'>
        <span
          className='absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300'
          style={{ width: `${percent}%` }}
        />
      </span>
      {done}/{total}
    </span>
  );
}

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'text-[11px] font-medium tracking-wider text-muted-foreground uppercase',
        className
      )}
    >
      {children}
    </div>
  );
}
