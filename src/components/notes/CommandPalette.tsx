import {
  ArchiveRestore,
  CalendarDays,
  Columns2,
  Copy,
  Download,
  Eye,
  FileText,
  Folder,
  FolderPlus,
  Info,
  LayoutTemplate,
  Maximize2,
  Moon,
  Pencil,
  Pin,
  Plus,
  Printer,
  Sun,
  Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import type * as React from 'react';
import type { EditorMode } from '~/components/notes/NoteEditor';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from '~/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog';
import type { NotesView } from '~/lib/notebook';
import { formatListDate, noteMeta } from '~/lib/note-format';
import { NOTE_TEMPLATES } from '~/lib/note-templates';
import type { TemplateId } from '~/lib/note-templates';
import type { TagCount } from '~/lib/note-text';
import type { Note, NoteFolder } from '~/lib/notes';

export type PaletteActions = {
  openNote: (id: string) => void;
  newNote: () => void;
  today: () => void;
  newFolder: () => void;
  template: (id: TemplateId) => void;
  setView: (view: NotesView) => void;
  setMode: (mode: EditorMode) => void;
  toggleFocus: () => void;
  togglePin: () => void;
  openInfo: () => void;
  copy: () => void;
  exportFile: () => void;
  print: () => void;
  trash: () => void;
  restore: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Live notes, most recently edited first. */
  notes: Note[];
  folders: NoteFolder[];
  tags: TagCount[];
  currentNote: Note | null;
  mode: EditorMode;
  focusMode: boolean;
  actions: PaletteActions;
};

const RECENT_LIMIT = 6;

// Every item passes its searchable text as `keywords`; all query terms must match.
function filterItems(value: string, search: string, keywords?: string[]) {
  const haystack = (keywords?.length ? keywords.join(' ') : value).toLowerCase();
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.every((term) => haystack.includes(term))) return 0;
  // Rank title matches (the first keyword) above body matches.
  return terms.every((term) => (keywords?.[0] ?? value).toLowerCase().includes(term)) ? 1 : 0.5;
}

export function CommandPalette({
  open,
  onOpenChange,
  notes,
  folders,
  tags,
  currentNote,
  mode,
  focusMode,
  actions
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const searching = query.trim().length > 0;
  const shownNotes = searching ? notes : notes.slice(0, RECENT_LIMIT);
  const trashed = currentNote?.deletedAt != null;

  function handleOpenChange(next: boolean) {
    if (!next) setQuery('');
    onOpenChange(next);
  }

  // Close first so the dialog's focus trap is released before the action moves focus.
  function run(action: () => void) {
    handleOpenChange(false);
    window.setTimeout(action, 0);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className='top-[18%] translate-y-0 gap-0 overflow-hidden rounded-xl! p-0 sm:max-w-[560px]'
      >
        <DialogTitle className='sr-only'>Command palette</DialogTitle>
        <DialogDescription className='sr-only'>Jump to a note or run a command.</DialogDescription>
        <Command filter={filterItems} loop className='rounded-none! p-0'>
          <div className='border-b border-border p-1.5 [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=input-group]]:h-10! [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-transparent'>
            <CommandInput value={query} onValueChange={setQuery} placeholder='Search notes or type a command' className='text-[14.5px]' />
          </div>
          <CommandList className='max-h-[min(420px,60vh)] p-1.5'>
            <CommandEmpty className='py-10 text-[13.5px] text-muted-foreground'>No results for “{query.trim()}”.</CommandEmpty>

            {shownNotes.length ? (
              <CommandGroup heading={searching ? 'Notes' : 'Recent notes'}>
                {shownNotes.map((note) => {
                  const meta = noteMeta(note);
                  return (
                    <CommandItem
                      key={note.id}
                      value={`note:${note.id}`}
                      keywords={[note.title || 'Untitled', meta.tags.map((tag) => `#${tag}`).join(' '), meta.snippet]}
                      onSelect={() => run(() => actions.openNote(note.id))}
                    >
                      <FileText className='text-muted-foreground' />
                      <span className='truncate'>{note.title.trim() || 'Untitled'}</span>
                      <CommandShortcut className='tracking-normal'>{formatListDate(note.updatedAt)}</CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}

            <CommandGroup heading='Create'>
              <Item icon={<Plus />} label='New note' shortcut='⌥⌘N' onSelect={() => run(actions.newNote)} />
              <Item icon={<CalendarDays />} label='Open today’s note' keywords='daily journal' onSelect={() => run(actions.today)} />
              {NOTE_TEMPLATES.map((template) => (
                <Item
                  key={template.id}
                  icon={<LayoutTemplate />}
                  label={`New ${template.name.toLowerCase()}`}
                  keywords='template'
                  onSelect={() => run(() => actions.template(template.id))}
                />
              ))}
              <Item icon={<FolderPlus />} label='New folder' onSelect={() => run(actions.newFolder)} />
            </CommandGroup>

            {currentNote && !trashed ? (
              <CommandGroup heading='This note'>
                {mode !== 'edit' ? <Item icon={<Pencil />} label='Edit' keywords='mode write' onSelect={() => run(() => actions.setMode('edit'))} /> : null}
                {mode !== 'split' ? <Item icon={<Columns2 />} label='Split view' keywords='mode side by side' onSelect={() => run(() => actions.setMode('split'))} /> : null}
                {mode !== 'preview' ? <Item icon={<Eye />} label='Preview' keywords='mode read' onSelect={() => run(() => actions.setMode('preview'))} /> : null}
                <Item icon={<Maximize2 />} label={focusMode ? 'Exit focus mode' : 'Focus mode'} shortcut='⌘⇧F' keywords='zen distraction' onSelect={() => run(actions.toggleFocus)} />
                <Item icon={<Pin />} label={currentNote.pinned ? 'Unpin note' : 'Pin note'} onSelect={() => run(actions.togglePin)} />
                <Item icon={<Info />} label='Note info' keywords='outline word count stats' onSelect={() => run(actions.openInfo)} />
                <Item icon={<Copy />} label='Copy Markdown' onSelect={() => run(actions.copy)} />
                <Item icon={<Download />} label='Export as .md' keywords='download markdown file' onSelect={() => run(actions.exportFile)} />
                <Item icon={<Printer />} label='Print or save as PDF' shortcut='⌘P' onSelect={() => run(actions.print)} />
                <Item icon={<Trash2 />} label='Delete note' keywords='remove trash' onSelect={() => run(actions.trash)} />
              </CommandGroup>
            ) : null}
            {currentNote && trashed ? (
              <CommandGroup heading='This note'>
                <Item icon={<ArchiveRestore />} label='Restore note' onSelect={() => run(actions.restore)} />
              </CommandGroup>
            ) : null}

            <CommandGroup heading='Go to'>
              <Item icon={<FileText />} label='All notes' onSelect={() => run(() => actions.setView('all'))} />
              <Item icon={<Pin />} label='Pinned' onSelect={() => run(() => actions.setView('pinned'))} />
              {folders.map((folder) => (
                <Item
                  key={folder.id}
                  icon={<Folder />}
                  label={folder.name}
                  keywords='folder'
                  onSelect={() => run(() => actions.setView(`folder:${folder.id}`))}
                />
              ))}
              {tags.map(({ tag }) => (
                <Item
                  key={tag}
                  icon={<span className='w-4 text-center text-[13px] text-muted-foreground'>#</span>}
                  label={`#${tag}`}
                  keywords='tag'
                  onSelect={() => run(() => actions.setView(`tag:${tag}`))}
                />
              ))}
              <Item icon={<Trash2 />} label='Recently deleted' keywords='trash' onSelect={() => run(() => actions.setView('trash'))} />
            </CommandGroup>

            <CommandGroup heading='Appearance'>
              <Item
                icon={dark ? <Sun /> : <Moon />}
                label={dark ? 'Light mode' : 'Dark mode'}
                keywords='theme appearance'
                onSelect={() => run(() => setTheme(dark ? 'light' : 'dark'))}
              />
            </CommandGroup>
          </CommandList>
          <div className='hidden items-center gap-4 border-t border-border px-3.5 py-2 text-[11.5px] text-muted-foreground sm:flex'>
            <span>↑↓ to move</span>
            <span>↵ to open</span>
            <span className='ml-auto'>esc to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  icon,
  label,
  shortcut,
  keywords,
  onSelect
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  keywords?: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem value={`cmd:${label}`} keywords={[label, keywords ?? '']} onSelect={onSelect}>
      <span className='flex text-muted-foreground'>{icon}</span>
      {label}
      {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
    </CommandItem>
  );
}
