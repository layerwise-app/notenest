import {
  CalendarDays,
  ChevronRight,
  FileText,
  Folder,
  Info,
  Maximize2,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import type * as React from 'react';
import { NoteNestMark } from '~/components/brand';
import { cn } from '~/lib/utils';
import {
  InlineTag,
  MockCheckbox,
  MockKbd,
  MockNoteRow,
  WikiLink
} from '~/components/landing/mock-ui';
import type { MockNote } from '~/components/landing/mock-ui';

const notes: MockNote[] = [
  {
    title: 'Q4 planning',
    snippet: 'Ship the sync rewrite before the offsite, then spend November on onboarding.',
    date: '9:41 AM',
    tags: ['work'],
    progress: { done: 2, total: 5 }
  },
  {
    title: 'October 14, 2026',
    snippet: 'Slept well. Morning walk, then two hours on the project brief.',
    date: '8:02 AM',
    tags: ['daily']
  },
  {
    title: 'Reading list — autumn',
    snippet: 'The Overstory, Four Thousand Weeks, A Pattern Language, Piranesi.',
    date: 'Yesterday',
    tags: ['reading'],
    progress: { done: 3, total: 7 }
  },
  {
    title: 'Offsite agenda',
    snippet: 'Day one: retro and themes. Day two: roadmap, owners, and follow-ups.',
    date: 'Oct 11',
    tags: ['work']
  },
  {
    title: 'Sourdough notes',
    snippet: 'Levain at 1:5:5, bulk four hours at 24°C. Shape tight, retard overnight.',
    date: 'Oct 9',
    tags: ['ideas']
  },
  {
    title: 'Studio ideas',
    snippet: 'A shared shelf for borrowed books. Quiet hours on Friday mornings.',
    date: 'Oct 6',
    tags: ['ideas']
  }
];

const checklist = [
  { text: 'Draft the roadmap memo', done: true },
  { text: 'Review onboarding interviews', done: true },
  { text: 'Share metrics with the team', done: false },
  { text: 'Book the offsite venue', done: false }
];

export function NotebookShowcase() {
  return (
    <div
      aria-hidden='true'
      className='relative mx-auto w-full max-w-[1180px] select-none'
    >
      <div className='overflow-hidden rounded-2xl border border-border bg-paper shadow-[0_1px_2px_rgb(30_26_29/0.05),0_30px_80px_-24px_rgb(60_22_52/0.28)]'>
        <div className='flex h-[560px] sm:h-[600px] lg:h-[640px]'>
          <ShowcaseSidebar />
          <ShowcaseList />
          <ShowcaseEditor />
        </div>
      </div>
    </div>
  );
}

function SidebarRow({
  icon,
  label,
  count,
  active
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-sidebar-foreground',
        active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
      )}
    >
      <span className={cn('text-muted-foreground [&_svg]:size-4', active && 'text-primary')}>
        {icon}
      </span>
      <span className='truncate'>{label}</span>
      {count !== undefined ? (
        <span className='ml-auto text-xs text-muted-foreground tabular-nums'>{count}</span>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className='px-2.5 pt-5 pb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
      {children}
    </div>
  );
}

function ShowcaseSidebar() {
  const tags: [string, number][] = [
    ['daily', 12],
    ['ideas', 7],
    ['work', 5],
    ['reading', 4]
  ];
  return (
    <div className='hidden w-[216px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2.5 py-3.5 lg:flex'>
      <div className='flex items-center gap-2 px-1.5'>
        <NoteNestMark className='size-6' />
        <span className='font-serif text-[16px] font-semibold'>NoteNest</span>
      </div>
      <div className='mt-4 flex h-8 items-center gap-2 rounded-md border border-border bg-paper px-2.5 text-[13px] font-medium shadow-xs'>
        <Plus className='size-4 text-primary' />
        New note
        <MockKbd className='ml-auto h-[18px] text-[10.5px]'>⌥⌘N</MockKbd>
      </div>
      <div className='mt-3 space-y-0.5'>
        <SidebarRow icon={<FileText />} label='All notes' count={24} active />
        <SidebarRow icon={<CalendarDays />} label='Today' />
        <SidebarRow icon={<Pin />} label='Pinned' count={3} />
      </div>
      <SectionLabel>Folders</SectionLabel>
      <div className='space-y-0.5'>
        <SidebarRow icon={<Folder />} label='Work' count={9} />
        <SidebarRow icon={<Folder />} label='Personal' count={8} />
        <SidebarRow icon={<Folder />} label='Reading' count={4} />
      </div>
      <SectionLabel>Tags</SectionLabel>
      <div className='space-y-0.5'>
        {tags.map(([tag, count]) => (
          <div
            key={tag}
            className='flex h-7 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-sidebar-foreground'
          >
            <span className='w-4 text-center font-medium text-muted-foreground'>#</span>
            {tag}
            <span className='ml-auto text-xs text-muted-foreground tabular-nums'>{count}</span>
          </div>
        ))}
      </div>
      <div className='mt-auto space-y-2'>
        <SidebarRow icon={<Trash2 />} label='Recently deleted' count={2} />
        <div className='flex items-center gap-2.5 border-t border-sidebar-border px-2.5 pt-3 text-[12.5px]'>
          <span className='grid size-6 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground'>
            M
          </span>
          <span className='font-medium'>Maya Chen</span>
          <span className='ml-auto flex items-center gap-1.5 text-[11.5px] text-muted-foreground'>
            <span className='size-1.5 rounded-full bg-primary' />
            Synced
          </span>
        </div>
      </div>
    </div>
  );
}

function ShowcaseList() {
  return (
    <div className='hidden w-[300px] shrink-0 flex-col border-r border-border bg-background md:flex'>
      <div className='px-3 pt-3.5'>
        <div className='flex h-8 items-center gap-2 rounded-md border border-border bg-paper px-2.5 text-[13px] text-muted-foreground'>
          <Search className='size-3.5' />
          Search notes
          <MockKbd className='ml-auto h-[18px] text-[10.5px]'>⌘K</MockKbd>
        </div>
      </div>
      <div className='flex items-baseline justify-between px-4 pt-4 pb-2'>
        <span className='font-serif text-[22px] font-medium tracking-tight'>All notes</span>
        <span className='text-[12px] text-muted-foreground tabular-nums'>24 notes</span>
      </div>
      <div className='px-4 pt-1 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
        Today
      </div>
      <div className='space-y-0.5 px-1.5'>
        {notes.slice(0, 2).map((note, index) => (
          <MockNoteRow key={note.title} note={note} selected={index === 0} />
        ))}
      </div>
      <div className='px-4 pt-3 pb-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
        Previous 7 days
      </div>
      <div className='space-y-0.5 px-1.5'>
        {notes.slice(2).map((note) => (
          <MockNoteRow key={note.title} note={note} />
        ))}
      </div>
    </div>
  );
}

function ShowcaseEditor() {
  return (
    <div className='flex min-w-0 flex-1 flex-col bg-paper'>
      <div className='flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-4'>
        <div className='flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground'>
          <span>Work</span>
          <ChevronRight className='size-3.5' />
          <span className='truncate font-medium text-foreground'>Q4 planning</span>
        </div>
        <div className='ml-auto hidden items-center rounded-lg bg-muted p-0.5 text-[12.5px] font-medium sm:flex'>
          <span className='px-2.5 py-1 text-muted-foreground'>Edit</span>
          <span className='px-2.5 py-1 text-muted-foreground'>Split</span>
          <span className='rounded-md bg-paper px-2.5 py-1 text-foreground shadow-sm'>Preview</span>
        </div>
        <div className='ml-auto flex items-center text-muted-foreground sm:ml-1'>
          {[Maximize2, Pin, Info, MoreHorizontal].map((Icon, index) => (
            <span key={index} className='grid size-8 place-items-center rounded-md'>
              <Icon className={cn('size-4', index === 1 && 'fill-primary text-primary')} />
            </span>
          ))}
        </div>
      </div>
      <div className='min-h-0 flex-1 overflow-hidden'>
        <article className='mx-auto max-w-[620px] px-6 pt-8 pb-10 sm:px-10 sm:pt-10'>
          <div className='text-[12.5px] text-muted-foreground'>
            Edited 9:41 AM · 412 words · 2 min read
          </div>
          <h3 className='mt-2 font-serif text-[30px] leading-tight font-medium tracking-tight sm:text-[34px]'>
            Q4 planning
          </h3>
          <div className='mt-4 space-y-4 font-serif text-[17px] leading-relaxed text-ink-soft sm:text-[18px]'>
            <p>
              Ship the sync rewrite before the offsite, then spend November on onboarding.
              Decisions from <WikiLink>Offsite agenda</WikiLink> still hold. <InlineTag>work</InlineTag>
            </p>
            <h4 className='pt-1 font-serif text-[21px] font-semibold text-foreground'>This week</h4>
            <ul className='space-y-1.5'>
              {checklist.map((item) => (
                <li key={item.text} className='flex gap-3'>
                  <MockCheckbox checked={item.done} />
                  <span className={cn(item.done && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <blockquote className='border-l-2 border-primary/40 pl-4 text-muted-foreground italic'>
              Fewer things, done carefully.
            </blockquote>
          </div>
          <div className='mt-8 border-t border-border pt-4'>
            <div className='text-[11px] font-medium tracking-wider text-muted-foreground uppercase'>
              Linked from 2 notes
            </div>
            <div className='mt-2.5 grid gap-2 sm:grid-cols-2'>
              {[
                ['Offsite agenda', 'Follow-ups land in Q4 planning.'],
                ['Weekly review — Oct 10', 'Moved the memo into Q4 planning.']
              ].map(([title, text]) => (
                <div key={title} className='rounded-lg border border-border bg-background px-3 py-2.5'>
                  <div className='text-[13px] font-semibold'>{title}</div>
                  <div className='mt-0.5 truncate text-[12.5px] text-muted-foreground'>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
