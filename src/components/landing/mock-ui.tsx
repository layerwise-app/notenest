import { Check } from 'lucide-react';
import type * as React from 'react';
import { cn } from '~/lib/utils';

// Small static pieces that mirror the real notebook UI inside landing mockups.

export function TagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] leading-none font-medium text-accent-foreground',
        className
      )}
    >
      #{tag}
    </span>
  );
}

export function MockCheckbox({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'mt-[0.32em] grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-paper',
        className
      )}
    >
      {checked ? <Check className='size-3' strokeWidth={3} /> : null}
    </span>
  );
}

export function MockKbd({ children, className }: { children: React.ReactNode; className?: string }) {
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

export function WikiLink({ children }: { children: React.ReactNode }) {
  return (
    <span className='text-primary underline decoration-primary/30 underline-offset-4'>
      {children}
    </span>
  );
}

export function InlineTag({ children }: { children: React.ReactNode }) {
  return <span className='font-sans text-[0.82em] font-medium text-primary'>#{children}</span>;
}

/** Thin progress bar with an "x/y" label, matching the note list meta row. */
export function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <span className='inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground tabular-nums'>
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

/** A framed window used for product snippets. */
export function SnippetFrame({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-paper shadow-[0_1px_2px_rgb(30_26_29/0.04),0_12px_32px_-12px_rgb(30_26_29/0.14)]',
        className
      )}
    >
      {children}
    </div>
  );
}

export type MockNote = {
  title: string;
  snippet: string;
  date: string;
  tags?: string[];
  progress?: { done: number; total: number };
  pinned?: boolean;
};

export function MockNoteRow({
  note,
  selected,
  className
}: {
  note: MockNote;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg px-3 py-2.5', selected && 'bg-accent', className)}>
      <div
        className={cn(
          'truncate text-[14px] font-semibold text-foreground',
          selected && 'text-accent-foreground'
        )}
      >
        {note.title}
      </div>
      <p className='mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground'>
        {note.snippet}
      </p>
      <div className='mt-1.5 flex items-center gap-2 text-[11.5px] text-muted-foreground'>
        <span className='tabular-nums'>{note.date}</span>
        {note.tags?.map((tag) => <TagChip key={tag} tag={tag} />)}
        {note.progress ? (
          <span className='ml-auto'>
            <ChecklistProgress {...note.progress} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
