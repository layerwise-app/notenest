import { FileText } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  InlineTag,
  MockNoteRow,
  SnippetFrame,
  WikiLink
} from '~/components/landing/mock-ui';
import type { MockNote } from '~/components/landing/mock-ui';

const backlinks = [
  { title: 'Offsite agenda', before: 'Owners and dates go straight into ', after: '.' },
  { title: 'Weekly review — Oct 10', before: 'Moved the memo draft into ', after: ' for now.' },
  { title: 'October 14, 2026', before: 'Two hours on ', after: ' before lunch.' }
];

export function LinksSnippet() {
  return (
    <SnippetFrame aria-hidden='true'>
      <div className='px-6 pt-6 pb-5 sm:px-8 sm:pt-7'>
        <div className='font-serif text-[24px] font-medium tracking-tight'>Q4 planning</div>
        <p className='mt-2.5 font-serif text-[17px] leading-relaxed text-ink-soft'>
          Decisions from <WikiLink>Offsite agenda</WikiLink> still hold. Hiring moves to{' '}
          <WikiLink>Hiring plan</WikiLink>, and the launch note lives in{' '}
          <WikiLink>Studio brief</WikiLink>.
        </p>
      </div>
      <div className='border-t border-border bg-background/60 px-6 py-5 sm:px-8'>
        <div className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
          Linked from 3 notes
        </div>
        <ul className='mt-3 space-y-1.5'>
          {backlinks.map((link) => (
            <li
              key={link.title}
              className='flex items-start gap-3 rounded-lg border border-border bg-paper px-3 py-2.5'
            >
              <FileText className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
              <div className='min-w-0'>
                <div className='text-[13.5px] font-semibold'>{link.title}</div>
                <div className='mt-0.5 truncate text-[12.5px] text-muted-foreground'>
                  {link.before}
                  <span className='rounded bg-highlight px-0.5 text-accent-foreground'>
                    [[Q4 planning]]
                  </span>
                  {link.after}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </SnippetFrame>
  );
}

const tagCounts: [string, number][] = [
  ['daily', 12],
  ['ideas', 7],
  ['work', 5],
  ['reading', 4],
  ['recipes', 3]
];

const ideaNotes: MockNote[] = [
  {
    title: 'Studio ideas',
    snippet: 'A shared shelf for borrowed books. Quiet hours on Friday mornings.',
    date: 'Oct 6',
    tags: ['ideas']
  },
  {
    title: 'Sourdough notes',
    snippet: 'Try a 30% rye levain next. Score deeper on the long side.',
    date: 'Oct 9',
    tags: ['ideas', 'recipes']
  },
  {
    title: 'Newsletter topics',
    snippet: 'Why slow tools win. Notes on margins. The case for plain text.',
    date: 'Sep 28',
    tags: ['ideas', 'work']
  }
];

export function TagsSnippet() {
  return (
    <SnippetFrame aria-hidden='true' className='grid sm:grid-cols-[176px_1fr]'>
      <div className='hidden border-r border-sidebar-border bg-sidebar px-2.5 py-4 sm:block'>
        <div className='px-2.5 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
          Tags
        </div>
        <div className='space-y-0.5'>
          {tagCounts.map(([tag, count]) => {
            const active = tag === 'ideas';
            return (
              <div
                key={tag}
                className={cn(
                  'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-sidebar-foreground',
                  active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                )}
              >
                <span
                  className={cn(
                    'w-3 text-center font-medium text-muted-foreground',
                    active && 'text-primary'
                  )}
                >
                  #
                </span>
                {tag}
                <span className='ml-auto text-xs text-muted-foreground tabular-nums'>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className='min-w-0 bg-background'>
        <div className='flex items-baseline justify-between border-b border-border px-4 pt-4 pb-3'>
          <span className='font-serif text-[22px] font-medium tracking-tight'>
            <span className='text-primary'>#</span>ideas
          </span>
          <span className='text-[12px] text-muted-foreground tabular-nums'>7 notes</span>
        </div>
        <div className='space-y-0.5 p-1.5'>
          {ideaNotes.map((note, index) => (
            <MockNoteRow key={note.title} note={note} selected={index === 0} />
          ))}
        </div>
        <div className='border-t border-border px-4 py-3 font-serif text-[15px] text-ink-soft'>
          Quiet hours on Friday mornings. <InlineTag>ideas</InlineTag>
        </div>
      </div>
    </SnippetFrame>
  );
}
