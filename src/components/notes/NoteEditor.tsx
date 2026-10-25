import {
  ArchiveRestore,
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FolderInput,
  Info,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Pin,
  Printer,
  Trash2
} from 'lucide-react';
import { useRef } from 'react';
import type * as React from 'react';
import { Backlinks } from '~/components/notes/Backlinks';
import { EditorToolbar } from '~/components/notes/EditorToolbar';
import { MarkdownEditor } from '~/components/notes/MarkdownEditor';
import type { MarkdownEditorHandle } from '~/components/notes/MarkdownEditor';
import { MarkdownView } from '~/components/notes/MarkdownView';
import { NoteInfoPanel } from '~/components/notes/NoteInfoPanel';
import { IconButton } from '~/components/notes/note-ui';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet';
import { useAutosize } from '~/hooks/use-autosize';
import { useMediaQuery } from '~/hooks/use-media-query';
import { formatEdited } from '~/lib/note-format';
import { findNoteByTitle, readingMinutes, toggleTaskLine, wordCount } from '~/lib/note-text';
import type { Note, NoteFolder } from '~/lib/notes';
import { cn } from '~/lib/utils';

export type EditorMode = 'edit' | 'split' | 'preview';

export const EDITOR_MODES: { id: EditorMode; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'split', label: 'Split' },
  { id: 'preview', label: 'Preview' }
];

export type NoteActions = {
  change: (patch: { title?: string; content?: string }) => void;
  togglePin: () => void;
  move: (folderId: string | null) => void;
  trash: () => void;
  restore: () => void;
  copy: () => void;
  exportFile: () => void;
  print: () => void;
  openNote: (id: string) => void;
  openLink: (title: string) => void;
  createLinkedNote: (title: string) => void;
  /** False (after telling the user why) when attachments aren't available. */
  canAttach: () => boolean;
  attachFiles: (files: File[]) => void;
  showTag: (tag: string) => void;
  showFolder: (folderId: string) => void;
  back: () => void;
};

type NoteEditorProps = {
  note: Note;
  notes: Note[];
  folders: NoteFolder[];
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  infoOpen: boolean;
  onInfoOpenChange: (open: boolean) => void;
  editorRef: React.RefObject<MarkdownEditorHandle | null>;
  titleRef: React.RefObject<HTMLTextAreaElement | null>;
  actions: NoteActions;
};

export function NoteEditor({
  note,
  notes,
  folders,
  mode: requestedMode,
  onModeChange,
  focusMode,
  onToggleFocus,
  infoOpen,
  onInfoOpenChange,
  editorRef,
  titleRef,
  actions
}: NoteEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isWide = useMediaQuery('(min-width: 1280px)');
  const canSplit = useMediaQuery('(min-width: 640px)');
  const trashed = note.deletedAt !== null;
  const mode: EditorMode = trashed ? 'preview' : requestedMode === 'split' && !canSplit ? 'edit' : requestedMode;
  const folder = folders.find((item) => item.id === note.folderId) ?? null;
  const words = wordCount(note.content);
  useAutosize(titleRef, note.title, mode);

  const viewActions = {
    hasNote: (title: string) => findNoteByTitle(notes, title) !== null,
    onOpenLink: actions.openLink,
    onTagClick: actions.showTag,
    onToggleTask: trashed ? undefined : (line: number) => actions.change({ content: toggleTaskLine(note.content, line) })
  };

  function jumpToLine(line: number) {
    if (mode === 'edit') {
      editorRef.current?.revealLine(line);
    } else {
      scrollRef.current
        ?.querySelector(`[data-line="${line}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (!isWide) onInfoOpenChange(false);
  }

  const editor = (variant: 'prose' | 'source') => (
    <MarkdownEditor
      ref={editorRef}
      value={note.content}
      onChange={(content) => actions.change({ content })}
      notes={notes}
      currentNoteId={note.id}
      onCreateNote={actions.createLinkedNote}
      onFiles={(files) => {
        if (actions.canAttach()) actions.attachFiles(files);
      }}
      variant={variant}
    />
  );
  const preview = (compact: boolean) =>
    note.content.trim() ? (
      <MarkdownView content={note.content} compact={compact} {...viewActions} />
    ) : (
      <p className='font-serif text-[18px] text-muted-foreground'>Nothing to preview yet.</p>
    );

  const info = (
    <NoteInfoPanel
      note={note}
      onJumpToLine={jumpToLine}
      onTagClick={actions.showTag}
      onClose={() => onInfoOpenChange(false)}
    />
  );

  return (
    <section aria-label='Note' className='flex h-full min-w-0 flex-1 flex-col bg-paper'>
      <header
        className={cn(
          'flex h-12 shrink-0 items-center gap-1 border-b border-border/70 px-2 transition-opacity sm:px-3',
          focusMode && 'border-transparent opacity-50 hover:opacity-100 focus-within:opacity-100'
        )}
      >
        <IconButton label='Back to notes' onClick={actions.back} className='md:hidden'>
          <ArrowLeft className='size-4' />
        </IconButton>
        <nav aria-label='Location' className='hidden min-w-0 items-center gap-1.5 pl-1 text-[13px] text-muted-foreground sm:flex'>
          {folder ? (
            <button
              type='button'
              onClick={() => actions.showFolder(folder.id)}
              className='max-w-40 truncate rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40'
            >
              {folder.name}
            </button>
          ) : (
            <span>{trashed ? 'Recently deleted' : 'Notes'}</span>
          )}
          <ChevronRight className='size-3.5 shrink-0 opacity-60' />
          <span className='truncate font-medium text-foreground'>{note.title.trim() || 'Untitled'}</span>
        </nav>

        <div className='ml-auto flex items-center gap-0.5'>
          {!trashed ? (
            <>
              <div
                role='group'
                aria-label='View mode'
                className='mr-1.5 hidden items-center rounded-lg bg-muted p-0.5 text-[12.5px] font-medium sm:flex'
              >
                {EDITOR_MODES.map((item) => (
                  <button
                    key={item.id}
                    type='button'
                    aria-pressed={mode === item.id}
                    title={`${item.label} (⌘/ to cycle)`}
                    onClick={() => onModeChange(item.id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                      mode === item.id
                        ? 'bg-paper text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <IconButton
                label={mode === 'preview' ? 'Edit' : 'Preview'}
                onClick={() => onModeChange(mode === 'preview' ? 'edit' : 'preview')}
                className='sm:hidden'
              >
                {mode === 'preview' ? <Pencil className='size-4' /> : <Eye className='size-4' />}
              </IconButton>
              <IconButton
                label={focusMode ? 'Exit focus mode' : 'Focus mode'}
                shortcut='⌘⇧F'
                active={focusMode}
                onClick={onToggleFocus}
                className='hidden md:inline-flex'
              >
                {focusMode ? <Minimize2 className='size-4' /> : <Maximize2 className='size-4' />}
              </IconButton>
              <IconButton label={note.pinned ? 'Unpin' : 'Pin'} onClick={actions.togglePin}>
                <Pin className={cn('size-4', note.pinned && 'fill-primary text-primary')} />
              </IconButton>
            </>
          ) : (
            <Button size='sm' variant='outline' onClick={actions.restore} className='mr-1'>
              <ArchiveRestore className='size-4' />
              Restore
            </Button>
          )}
          <IconButton label='Note info' active={infoOpen} onClick={() => onInfoOpenChange(!infoOpen)}>
            <Info className='size-4' />
          </IconButton>
          <NoteMenu note={note} folders={folders} actions={actions} />
        </div>
      </header>

      {mode !== 'preview' && !focusMode ? (
        <div className='flex h-11 shrink-0 items-center border-b border-border/70 px-2 sm:px-3'>
          <EditorToolbar
            onFormat={(command) => editorRef.current?.format(command)}
            onWikiLink={() => editorRef.current?.startWikiLink()}
            onAttach={() => {
              if (actions.canAttach()) fileInputRef.current?.click();
            }}
          />
          <input
            ref={fileInputRef}
            type='file'
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (files.length) actions.attachFiles(files);
            }}
          />
        </div>
      ) : null}

      <div className='flex min-h-0 flex-1'>
        <div ref={scrollRef} data-scroll-root className='min-w-0 flex-1 overflow-y-auto'>
          <article
            className={cn(
              'mx-auto px-5 pt-8 pb-28 sm:px-10 sm:pt-12',
              mode === 'split' ? 'max-w-[1240px]' : 'max-w-[720px]',
              focusMode && 'sm:pt-20'
            )}
          >
            {trashed ? (
              <p className='mb-6 rounded-lg bg-muted px-3.5 py-2.5 font-sans text-[13px] text-muted-foreground'>
                This note is in Recently deleted. Restore it to edit.
              </p>
            ) : null}
            <p className='font-sans text-[12.5px] text-muted-foreground tabular-nums'>
              {formatEdited(note.updatedAt)} · {words.toLocaleString('en')} {words === 1 ? 'word' : 'words'} ·{' '}
              {readingMinutes(words)} min read
            </p>
            <textarea
              ref={titleRef}
              value={note.title}
              readOnly={trashed}
              rows={1}
              maxLength={500}
              placeholder='Untitled'
              aria-label='Note title'
              onChange={(event) => actions.change({ title: event.target.value.replace(/\n/g, ' ') })}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  editorRef.current?.focus();
                }
              }}
              className='mt-2 block w-full resize-none overflow-hidden bg-transparent font-serif text-[30px] leading-[1.2] font-medium tracking-[-0.015em] text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-[36px]'
            />
            <div className='mt-6'>
              {mode === 'edit' ? editor('prose') : null}
              {mode === 'preview' ? preview(false) : null}
              {mode === 'split' ? (
                <div className='grid grid-cols-2 gap-10'>
                  <div className='min-w-0 border-r border-border/70 pr-10'>{editor('source')}</div>
                  <div className='min-w-0'>{preview(true)}</div>
                </div>
              ) : null}
            </div>
            {!trashed ? <Backlinks note={note} notes={notes} onOpenNote={actions.openNote} /> : null}
          </article>
        </div>
        {infoOpen && isWide ? (
          <aside className='w-[272px] shrink-0 border-l border-border/70 bg-paper'>{info}</aside>
        ) : null}
      </div>

      {!isWide ? (
        <Sheet open={infoOpen} onOpenChange={onInfoOpenChange}>
          <SheetContent side='right' showCloseButton={false} className='gap-0 bg-paper p-0 data-[side=right]:w-[300px] data-[side=right]:sm:max-w-[300px]'>
            <SheetTitle className='sr-only'>Note info</SheetTitle>
            <SheetDescription className='sr-only'>Stats, tags, and outline for this note.</SheetDescription>
            {info}
          </SheetContent>
        </Sheet>
      ) : null}
    </section>
  );
}

function NoteMenu({ note, folders, actions }: { note: Note; folders: NoteFolder[]; actions: NoteActions }) {
  const trashed = note.deletedAt !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label='More actions'
          className='text-muted-foreground hover:text-foreground'
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        {!trashed ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className='size-4' />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className='w-48'>
              <DropdownMenuRadioGroup
                value={note.folderId ?? 'none'}
                onValueChange={(value) => actions.move(value === 'none' ? null : value)}
              >
                <DropdownMenuRadioItem value='none'>No folder</DropdownMenuRadioItem>
                {folders.map((folder) => (
                  <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                    <span className='truncate'>{folder.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuItem onSelect={actions.copy}>
          <Copy className='size-4' />
          Copy Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={actions.exportFile}>
          <Download className='size-4' />
          Export as .md
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={actions.print}>
          <Printer className='size-4' />
          Print or save as PDF
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {trashed ? (
          <DropdownMenuItem onSelect={actions.restore}>
            <ArchiveRestore className='size-4' />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem variant='destructive' onSelect={actions.trash}>
            <Trash2 className='size-4' />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
