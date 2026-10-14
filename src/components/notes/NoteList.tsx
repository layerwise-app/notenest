import { ArrowDownUp, Folder, Menu, Pin, Plus, Search, X } from 'lucide-react';
import type * as React from 'react';
import { ChecklistProgress, IconButton, SectionLabel, TagChip } from '~/components/notes/note-ui';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { SORT_LABELS } from '~/lib/notebook';
import type { NoteGroup, SortKey } from '~/lib/notebook';
import { formatListDate, noteMeta } from '~/lib/note-format';
import type { Note } from '~/lib/notes';
import { cn } from '~/lib/utils';

type NoteListProps = {
  title: string;
  groups: NoteGroup[];
  count: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  sort: SortKey;
  onSortChange: (sort: SortKey) => void;
  folderNames: Map<string, string>;
  showFolders: boolean;
  empty: { text: string; action?: { label: string; run: () => void } };
  onNewNote: () => void;
  onOpenNav: () => void;
  className?: string;
};

export function NoteList({
  title,
  groups,
  count,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  searchRef,
  sort,
  onSortChange,
  folderNames,
  showFolders,
  empty,
  onNewNote,
  onOpenNav,
  className
}: NoteListProps) {
  const ordered = groups.flatMap((group) => group.notes);

  // Arrow keys move through the list like a native sidebar list.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const index = ordered.findIndex((note) => note.id === selectedId);
    const next = ordered[event.key === 'ArrowDown' ? index + 1 : Math.max(0, index - 1)];
    if (!next) return;
    event.preventDefault();
    onSelect(next.id);
    event.currentTarget.querySelector<HTMLElement>(`[data-note-id="${next.id}"]`)?.focus();
  }

  return (
    <section aria-label='Notes' className={cn('flex h-full flex-col bg-background', className)}>
      <div className='flex items-center gap-1.5 px-3 pt-3'>
        <IconButton label='Open sidebar' onClick={onOpenNav} className='-ml-1 lg:hidden'>
          <Menu className='size-4' />
        </IconButton>
        <div className='relative min-w-0 flex-1'>
          <Search className='pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground' />
          <input
            ref={searchRef}
            type='search'
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && search) {
                event.preventDefault();
                onSearchChange('');
              }
            }}
            placeholder='Search'
            aria-label='Search notes'
            className='h-8 w-full rounded-md border border-border bg-paper pr-7 pl-8 text-[13px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 [&::-webkit-search-cancel-button]:hidden'
          />
          {search ? (
            <button
              type='button'
              aria-label='Clear search'
              onClick={() => onSearchChange('')}
              className='absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground'
            >
              <X className='size-3.5' />
            </button>
          ) : null}
        </div>
        <IconButton label='New note' onClick={onNewNote} className='-mr-1 lg:hidden'>
          <Plus className='size-4' />
        </IconButton>
      </div>

      <div className='flex items-center justify-between gap-2 pt-4 pr-2 pb-1.5 pl-4'>
        <h1 className='truncate font-serif text-[22px] leading-tight font-medium tracking-tight'>{title}</h1>
        <div className='flex shrink-0 items-center gap-0.5'>
          <span className='text-[12px] text-muted-foreground tabular-nums'>
            {count} {count === 1 ? 'note' : 'notes'}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label={`Sort by ${SORT_LABELS[sort].toLowerCase()}`}
                className='text-muted-foreground hover:text-foreground'
              >
                <ArrowDownUp className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              <DropdownMenuLabel className='text-xs text-muted-foreground'>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSortChange(value as SortKey)}>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-1.5 pb-6' onKeyDown={handleKeyDown}>
        {count === 0 ? (
          <div className='px-4 pt-10 text-center'>
            <p className='text-[13.5px] text-muted-foreground'>{empty.text}</p>
            {empty.action ? (
              <Button variant='outline' size='sm' onClick={empty.action.run} className='mt-3'>
                {empty.action.label}
              </Button>
            ) : null}
          </div>
        ) : (
          groups.map((group, index) => (
            <div key={`${group.label}-${index}`} role='group' aria-label={group.label || 'Notes'}>
              {group.label ? (
                <SectionLabel className={cn('px-3 pb-1', index === 0 ? 'pt-1' : 'pt-4')}>{group.label}</SectionLabel>
              ) : null}
              <ul className='space-y-0.5'>
                {group.notes.map((note) => (
                  <li key={note.id}>
                    <NoteRow
                      note={note}
                      selected={note.id === selectedId}
                      date={formatListDate(sort === 'created' ? note.createdAt : note.updatedAt)}
                      folderName={showFolders ? folderNames.get(note.folderId ?? '') : undefined}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function NoteRow({
  note,
  selected,
  date,
  folderName,
  onSelect
}: {
  note: Note;
  selected: boolean;
  date: string;
  folderName?: string;
  onSelect: (id: string) => void;
}) {
  const { tags, snippet, checklist } = noteMeta(note);
  const title = note.title.trim();
  return (
    <button
      type='button'
      data-note-id={note.id}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(note.id)}
      className={cn(
        'block w-full rounded-lg px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        selected ? 'bg-accent' : 'hover:bg-muted/80'
      )}
    >
      <span className='flex items-center gap-2'>
        <span
          className={cn(
            'truncate text-[14px] font-semibold',
            selected ? 'text-accent-foreground' : 'text-foreground',
            !title && 'text-muted-foreground'
          )}
        >
          {title || 'Untitled'}
        </span>
        {note.pinned ? (
          <Pin aria-label='Pinned' className='ml-auto size-3 shrink-0 fill-primary text-primary' />
        ) : null}
      </span>
      <span className='mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground'>
        {snippet || 'No additional text'}
      </span>
      <span className='mt-1.5 flex min-w-0 items-center gap-2 text-[11.5px] text-muted-foreground'>
        <span className='shrink-0 tabular-nums'>{date}</span>
        {folderName ? (
          <span className='inline-flex max-w-24 shrink-0 items-center gap-1'>
            <Folder className='size-3 shrink-0' />
            <span className='truncate'>{folderName}</span>
          </span>
        ) : null}
        {/* Keep the meta row on one line: fewer tags when a folder and progress share it. */}
        {tags.slice(0, folderName && checklist.total ? 1 : 2).map((tag) => (
          <TagChip key={tag} tag={tag} className='min-w-0' />
        ))}
        {checklist.total ? (
          <span className='ml-auto pl-1'>
            <ChecklistProgress {...checklist} />
          </span>
        ) : null}
      </span>
    </button>
  );
}
