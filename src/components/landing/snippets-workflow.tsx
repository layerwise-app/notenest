import { useState } from 'react';
import {
  CalendarDays,
  Check,
  FileDown,
  FilePlus2,
  FileText,
  Maximize2,
  Plus,
  Printer,
  Search
} from 'lucide-react';
import type * as React from 'react';
import { cn } from '~/lib/utils';
import {
  ChecklistProgress,
  InlineTag,
  MockKbd,
  SnippetFrame,
  TagChip,
  WikiLink
} from '~/components/landing/mock-ui';

const initialTasks = [
  { id: 'tickets', text: 'Book train tickets', done: true },
  { id: 'stay', text: 'Confirm the apartment', done: true },
  { id: 'tram', text: 'Ride tram 28 at sunrise', done: false },
  { id: 'tiles', text: 'Visit the tile museum', done: false },
  { id: 'nata', text: 'Find the best pastel de nata', done: false }
];

/** The one intentionally interactive mockup: ticking items updates the list row. */
export function ChecklistSnippet() {
  const [tasks, setTasks] = useState(initialTasks);
  const done = tasks.filter((task) => task.done).length;

  return (
    <SnippetFrame>
      <div className='px-6 pt-6 pb-5 sm:px-8 sm:pt-7'>
        <div className='font-serif text-[24px] font-medium tracking-tight'>Weekend in Lisbon</div>
        <ul className='mt-3.5 space-y-1' aria-label='Example checklist'>
          {tasks.map((task) => (
            <li key={task.id}>
              <label className='group flex cursor-pointer items-start gap-3 rounded-md py-0.5 font-serif text-[17px] leading-relaxed text-ink-soft'>
                <input
                  type='checkbox'
                  className='peer sr-only'
                  checked={task.done}
                  onChange={() =>
                    setTasks((current) =>
                      current.map((item) =>
                        item.id === task.id ? { ...item, done: !item.done } : item
                      )
                    )
                  }
                />
                <span
                  aria-hidden='true'
                  className={cn(
                    'mt-[0.32em] grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40',
                    task.done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-paper group-hover:border-primary/60'
                  )}
                >
                  {task.done ? <Check className='size-3' strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    'transition-colors',
                    task.done && 'text-muted-foreground line-through decoration-muted-foreground/50'
                  )}
                >
                  {task.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div aria-hidden='true' className='border-t border-border bg-background/60 p-2 sm:p-3'>
        <div className='rounded-lg bg-accent px-3 py-2.5'>
          <div className='text-[14px] font-semibold text-accent-foreground'>Weekend in Lisbon</div>
          <p className='mt-0.5 truncate text-[13px] text-muted-foreground'>
            Book train tickets, confirm the apartment, ride tram 28 at sunrise.
          </p>
          <div className='mt-1.5 flex items-center gap-2 text-[11.5px] text-muted-foreground'>
            <span>Oct 12</span>
            <TagChip tag='travel' />
            <span className='ml-auto'>
              <ChecklistProgress done={done} total={tasks.length} />
            </span>
          </div>
        </div>
      </div>
    </SnippetFrame>
  );
}

function PaletteItem({
  icon,
  label,
  hint,
  active
}: {
  icon: React.ReactNode;
  label: string;
  hint?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px]',
        active && 'bg-muted'
      )}
    >
      <span className='text-muted-foreground [&_svg]:size-4'>{icon}</span>
      <span className='truncate'>{label}</span>
      {hint ? <span className='ml-auto shrink-0'>{hint}</span> : null}
    </div>
  );
}

function PaletteGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='p-1.5'>
      <div className='px-2.5 py-1.5 text-xs font-medium text-muted-foreground'>{title}</div>
      {children}
    </div>
  );
}

export function PaletteSnippet() {
  return (
    <SnippetFrame aria-hidden='true' className='mx-auto max-w-[520px] bg-popover'>
      <div className='flex h-12 items-center gap-2.5 border-b border-border px-4 text-[14.5px]'>
        <Search className='size-4 text-muted-foreground' />
        <span className='text-muted-foreground'>Search notes and commands…</span>
        <MockKbd className='ml-auto'>esc</MockKbd>
      </div>
      <PaletteGroup title='Notes'>
        <PaletteItem icon={<FileText />} label='Q4 planning' active hint={<TagChip tag='work' />} />
        <PaletteItem icon={<FileText />} label='Reading list — autumn' />
      </PaletteGroup>
      <div className='mx-3 h-px bg-border' />
      <PaletteGroup title='Actions'>
        <PaletteItem icon={<Plus />} label='New note' hint={<MockKbd>⌥⌘N</MockKbd>} />
        <PaletteItem icon={<FilePlus2 />} label='New note from template…' />
        <PaletteItem icon={<CalendarDays />} label='Today’s note' />
        <PaletteItem icon={<Maximize2 />} label='Toggle focus mode' />
      </PaletteGroup>
      <div className='flex items-center gap-4 border-t border-border bg-background/60 px-4 py-2.5 text-[11.5px] text-muted-foreground'>
        <span className='flex items-center gap-1.5'>
          <MockKbd>↑</MockKbd>
          <MockKbd>↓</MockKbd>
          Navigate
        </span>
        <span className='flex items-center gap-1.5'>
          <MockKbd>↵</MockKbd>
          Open
        </span>
      </div>
    </SnippetFrame>
  );
}

const modes = ['Edit', 'Split', 'Preview'] as const;
type Mode = (typeof modes)[number];

const source = [
  '## Launch week',
  'Draft lives in [[Studio brief]].',
  '',
  '- [x] Write the announcement',
  '- [ ] Record the demo #work',
  '',
  '> Fewer things, done carefully.'
];

export function ModesSnippet() {
  const [mode, setMode] = useState<Mode>('Split');

  return (
    <div className='space-y-4'>
      <SnippetFrame>
        <div className='flex h-12 items-center gap-2 border-b border-border/70 px-3 sm:px-4'>
          <div
            role='group'
            aria-label='Editor view example'
            className='flex items-center rounded-lg bg-muted p-0.5 text-[12.5px] font-medium'
          >
            {modes.map((item) => (
              <button
                key={item}
                type='button'
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
                  mode === item && 'bg-paper text-foreground shadow-sm'
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <span className='ml-auto truncate text-[12.5px] text-muted-foreground'>
            Edited just now
          </span>
        </div>
        <div
          aria-hidden='true'
          className={cn('grid min-h-[236px]', mode === 'Split' && 'sm:grid-cols-2')}
        >
          {mode !== 'Preview' ? (
            <pre
              className={cn(
                'overflow-hidden px-5 py-5 font-mono text-[12.5px] leading-[1.75] whitespace-pre-wrap text-ink-soft',
                mode === 'Split' && 'border-b border-border sm:border-r sm:border-b-0'
              )}
            >
              {source.map((line, index) => (
                <div key={index} className='min-h-[1.75em]'>
                  <SourceLine line={line} />
                </div>
              ))}
            </pre>
          ) : null}
          {mode !== 'Edit' ? (
            <div className='px-5 py-5 font-serif text-[16px] leading-relaxed text-ink-soft'>
              <div className='font-serif text-[20px] font-semibold text-foreground'>Launch week</div>
              <p className='mt-1.5'>
                Draft lives in <WikiLink>Studio brief</WikiLink>.
              </p>
              <ul className='mt-2.5 space-y-1'>
                <li className='flex gap-2.5'>
                  <span className='mt-[0.35em] grid size-4 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-primary bg-primary text-primary-foreground'>
                    <Check className='size-2.5' strokeWidth={3} />
                  </span>
                  <span className='text-muted-foreground line-through decoration-muted-foreground/50'>
                    Write the announcement
                  </span>
                </li>
                <li className='flex gap-2.5'>
                  <span className='mt-[0.35em] size-4 shrink-0 rounded-[4px] border-[1.5px] border-input' />
                  <span>
                    Record the demo <InlineTag>work</InlineTag>
                  </span>
                </li>
              </ul>
              <blockquote className='mt-3 border-l-2 border-primary/40 pl-3.5 text-muted-foreground italic'>
                Fewer things, done carefully.
              </blockquote>
            </div>
          ) : null}
        </div>
      </SnippetFrame>
      <div aria-hidden='true' className='flex flex-wrap items-center gap-1.5 text-[12.5px]'>
        {(
          [
            [FilePlus2, 'Meeting notes'],
            [FilePlus2, 'Daily journal'],
            [FilePlus2, 'Project brief'],
            [FileDown, '.md'],
            [Printer, 'PDF']
          ] as const
        ).map(([Icon, name]) => (
          <span
            key={name}
            className='inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-paper px-2.5 text-ink-soft'
          >
            <Icon className='size-3.5 text-primary' />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Light syntax coloring for the Markdown source column. */
function SourceLine({ line }: { line: string }) {
  if (line.startsWith('## ')) {
    return (
      <>
        <span className='text-primary/60'>## </span>
        <span className='font-medium text-foreground'>{line.slice(3)}</span>
      </>
    );
  }
  if (line.startsWith('> ')) {
    return (
      <>
        <span className='text-primary/60'>&gt; </span>
        <span className='italic'>{line.slice(2)}</span>
      </>
    );
  }
  const parts = line.split(/(\[\[[^\]]+\]\]|#\w+|^- \[[ x]\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) =>
        /^(\[\[|#\w|- \[)/.test(part) ? (
          <span key={index} className='text-primary'>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
