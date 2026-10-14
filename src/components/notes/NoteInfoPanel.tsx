import { X } from 'lucide-react';
import { IconButton, SectionLabel } from '~/components/notes/note-ui';
import { formatLongDate, noteMeta } from '~/lib/note-format';
import { extractOutline, readingMinutes, wordCount } from '~/lib/note-text';
import type { Note } from '~/lib/notes';
import { cn } from '~/lib/utils';

type NoteInfoProps = {
  note: Note;
  onJumpToLine: (line: number) => void;
  onTagClick: (tag: string) => void;
  onClose?: () => void;
  className?: string;
};

/** Stats, dates, tags, and a clickable outline for the open note. */
export function NoteInfoPanel({ note, onJumpToLine, onTagClick, onClose, className }: NoteInfoProps) {
  const words = wordCount(note.content);
  const { tags, checklist } = noteMeta(note);
  const outline = extractOutline(note.content);
  const minLevel = Math.min(...outline.map((item) => item.level));
  const stats: [string, string][] = [
    ['Words', words.toLocaleString('en')],
    ['Characters', note.content.length.toLocaleString('en')],
    ['Reading time', `${readingMinutes(words)} min`],
    ['Tasks', checklist.total ? `${checklist.done} of ${checklist.total}` : '—']
  ];

  return (
    <div className={cn('flex h-full flex-col overflow-y-auto font-sans', className)}>
      <div className='flex h-12 shrink-0 items-center justify-between pr-2 pl-5'>
        <h2 className='text-[13px] font-semibold'>Note info</h2>
        {onClose ? (
          <IconButton label='Close note info' onClick={onClose}>
            <X className='size-4' />
          </IconButton>
        ) : null}
      </div>
      <div className='space-y-6 px-5 pb-8'>
        <dl className='grid grid-cols-2 gap-x-3 gap-y-3.5'>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt className='text-[11.5px] text-muted-foreground'>{label}</dt>
              <dd className='mt-0.5 text-[15px] font-medium tabular-nums'>{value}</dd>
            </div>
          ))}
        </dl>

        {checklist.total ? (
          <div className='h-1 overflow-hidden rounded-full bg-border'>
            <div
              className='h-full rounded-full bg-primary transition-[width] duration-300'
              style={{ width: `${Math.round((checklist.done / checklist.total) * 100)}%` }}
            />
          </div>
        ) : null}

        <dl className='space-y-2.5 text-[12.5px]'>
          <div>
            <dt className='text-muted-foreground'>Created</dt>
            <dd className='mt-0.5'>{formatLongDate(note.createdAt)}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>Last edited</dt>
            <dd className='mt-0.5'>{formatLongDate(note.updatedAt)}</dd>
          </div>
        </dl>

        {tags.length ? (
          <div>
            <SectionLabel>Tags</SectionLabel>
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type='button'
                  onClick={() => onTagClick(tag)}
                  className='rounded-full bg-accent px-2 py-0.5 text-[12px] font-medium text-accent-foreground outline-none hover:bg-accent/70 focus-visible:ring-2 focus-visible:ring-ring/40'
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <nav aria-label='Outline'>
          <SectionLabel>Outline</SectionLabel>
          {outline.length ? (
            <ul className='mt-2 space-y-0.5 border-l border-border'>
              {outline.map((item) => (
                <li key={item.line}>
                  <button
                    type='button'
                    onClick={() => onJumpToLine(item.line)}
                    style={{ paddingLeft: `${(item.level - minLevel) * 12 + 12}px` }}
                    className={cn(
                      '-ml-px block w-full truncate border-l border-transparent py-1 pr-1 text-left text-[13px] text-muted-foreground outline-none hover:border-primary hover:text-foreground focus-visible:border-primary focus-visible:text-foreground',
                      item.level === minLevel && 'font-medium text-foreground/80'
                    )}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className='mt-2 text-[12.5px] text-muted-foreground'>Headings appear here.</p>
          )}
        </nav>
      </div>
    </div>
  );
}
