import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadAttachments } from '~/components/notes/attachments';
import { CommandPalette } from '~/components/notes/CommandPalette';
import { FolderDialogs } from '~/components/notes/FolderDialogs';
import type { FolderDialogState } from '~/components/notes/FolderDialogs';
import type { MarkdownEditorHandle } from '~/components/notes/MarkdownEditor';
import { MarkdownView } from '~/components/notes/MarkdownView';
import { NoteEditor } from '~/components/notes/NoteEditor';
import type { EditorMode, NoteActions } from '~/components/notes/NoteEditor';
import { NoteList } from '~/components/notes/NoteList';
import { NotebookSkeleton } from '~/components/notes/NotebookSkeleton';
import { Kbd } from '~/components/notes/note-ui';
import { NotesSidebar } from '~/components/notes/NotesSidebar';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet';
import { useMediaQuery } from '~/hooks/use-media-query';
import { useNotebook } from '~/hooks/use-notebook';
import type { Notebook } from '~/hooks/use-notebook';
import { useNotesPrefs } from '~/hooks/use-notes-prefs';
import { groupNotes, notesInView, searchNotes, sortNotes, viewFolderId, viewTag } from '~/lib/notebook';
import type { NotesView } from '~/lib/notebook';
import { copyNoteMarkdown, downloadNoteMarkdown } from '~/lib/note-export';
import { dailyNoteTitle, getTemplate } from '~/lib/note-templates';
import type { TemplateId } from '~/lib/note-templates';
import { countTags, extractTags, findNoteByTitle, hasTag } from '~/lib/note-text';
import { makeNote } from '~/lib/notes';
import type { Note } from '~/lib/notes';
import { cn } from '~/lib/utils';

const MODE_CYCLE: EditorMode[] = ['edit', 'split', 'preview'];

/** The three-pane notebook at /notes. Renders a skeleton until local notes load. */
export function NotesApp() {
  const notebook = useNotebook();
  if (!notebook.hydrated) return <NotebookSkeleton />;
  return <NotebookWorkspace notebook={notebook} />;
}

type NewNoteOptions = { title?: string; content?: string; focus?: 'title' | 'body'; inView?: boolean };

function NotebookWorkspace({ notebook }: { notebook: Notebook }) {
  const { snapshot, updateNote, addNote } = notebook;
  const [prefs, patchPrefs] = useNotesPrefs();
  const { sort, mode } = prefs;
  const [search, setSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>('list');
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const pendingFocus = useRef<'title' | 'body' | null>(null);
  const navigate = useNavigate();
  const twoPane = useMediaQuery('(min-width: 768px)');
  const wide = useMediaQuery('(min-width: 1024px)');

  const folders = snapshot.folders
    .filter((folder) => folder.deletedAt === null)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  const liveNotes = snapshot.notes.filter((note) => note.deletedAt === null);
  const recentNotes = sortNotes(liveNotes, 'edited', false);
  const tags = countTags(liveNotes);
  const folderCounts = new Map<string, number>();
  for (const note of liveNotes) {
    if (note.folderId) folderCounts.set(note.folderId, (folderCounts.get(note.folderId) ?? 0) + 1);
  }

  // A remembered folder view may point at a folder deleted on another device.
  const savedFolderId = viewFolderId(prefs.view);
  const view: NotesView = savedFolderId && !folderNames.has(savedFolderId) ? 'all' : prefs.view;
  const tag = viewTag(view);
  const inTrash = view === 'trash';
  const viewNotes = notesInView(snapshot.notes, view);
  const listNotes = sortNotes(searchNotes(viewNotes, search, folders), sort, !inTrash);

  const selected = snapshot.notes.find((note) => note.id === prefs.selectedId) ?? null;
  // Wider screens always show a note; phones start on the list.
  const current = selected ?? (twoPane ? (listNotes[0] ?? null) : null);
  const showEditorPane = mobilePane === 'editor' && current !== null;

  // Move focus into a note that was just created or opened from a command.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === 'title') titleRef.current?.focus();
    else editorRef.current?.focus();
  }, [current?.id]);

  function openNoteId(id: string, focus: 'title' | 'body' | null = null) {
    pendingFocus.current = focus;
    patchPrefs({ selectedId: id });
    setMobilePane('editor');
  }

  function changeView(next: NotesView) {
    const nextNotes = sortNotes(notesInView(snapshot.notes, next), sort, next !== 'trash');
    const keep = current && nextNotes.some((note) => note.id === current.id);
    patchPrefs({ view: next, selectedId: keep ? current.id : (nextNotes[0]?.id ?? null) });
    setSearch('');
    setNavOpen(false);
    setMobilePane('list');
  }

  /** Opens a note, switching away from a view or search that hides it. */
  function revealNote(note: Note) {
    if (!notesInView(snapshot.notes, view).some((item) => item.id === note.id)) {
      patchPrefs({ view: note.deletedAt === null ? 'all' : 'trash' });
    }
    if (!listNotes.some((item) => item.id === note.id)) setSearch('');
    setNavOpen(false);
    openNoteId(note.id);
  }

  function createNote({ title = '', content = '', focus = 'title', inView = true }: NewNoteOptions = {}) {
    // New notes land in the folder or tag being viewed.
    const body = inView && tag && !hasTag(extractTags(content), tag) ? `${content}\n\n#${tag}` : content;
    const note = makeNote(title, inView ? viewFolderId(view) : null, body);
    addNote(note);
    const staysInView = inView && view !== 'pinned' && view !== 'trash';
    patchPrefs({ ...(staysInView ? {} : { view: 'all' }), ...(mode === 'preview' ? { mode: 'edit' } : {}) });
    setSearch('');
    setNavOpen(false);
    openNoteId(note.id, focus);
  }

  function createFromTemplate(id: TemplateId) {
    const { title, content } = getTemplate(id).build(new Date());
    createNote({ title, content, focus: 'body' });
  }

  function openToday() {
    const now = new Date();
    const existing = findNoteByTitle(liveNotes, dailyNoteTitle(now));
    if (existing) return revealNote(existing);
    const { title, content } = getTemplate('journal').build(now);
    createNote({ title, content, focus: 'body', inView: false });
  }

  function openLink(title: string) {
    const target = findNoteByTitle(liveNotes, title);
    if (target) revealNote(target);
    else createNote({ title: title.trim(), focus: 'body', inView: false });
  }

  // From the `[[` picker: create the note quietly so the writer keeps typing.
  function createLinkedNote(title: string) {
    if (findNoteByTitle(liveNotes, title)) return;
    const note = makeNote(title.trim(), current?.folderId ?? null);
    addNote(note);
    toast(`Created “${note.title}”`, {
      action: { label: 'Open', onClick: () => patchPrefs({ view: 'all', selectedId: note.id }) }
    });
  }

  function restoreNote(note: Note) {
    const keepFolder = note.folderId !== null && folderNames.has(note.folderId);
    updateNote(note.id, { deletedAt: null, ...(keepFolder ? {} : { folderId: null }) });
    patchPrefs({ ...(inTrash ? { view: 'all' } : {}), selectedId: note.id });
  }

  function trashNote(note: Note) {
    const index = listNotes.findIndex((item) => item.id === note.id);
    const neighbor = index >= 0 ? (listNotes[index + 1] ?? listNotes[index - 1]) : undefined;
    updateNote(note.id, { deletedAt: Date.now() });
    patchPrefs({ selectedId: neighbor?.id ?? null });
    setMobilePane('list');
    setFocusMode(false);
    toast('Moved to Recently deleted', { action: { label: 'Undo', onClick: () => restoreNote(note) } });
  }

  function canAttach() {
    if (notebook.user) return true;
    toast('Attachments need sign-in.', { action: { label: 'Sign in', onClick: () => void navigate({ to: '/sign-in' }) } });
    return false;
  }

  // Inserts at the caret, or appends if the writer has moved to another note.
  function attachFiles(note: Note, files: File[]) {
    void uploadAttachments(note.id, files).then((markdown) => {
      if (markdown && !editorRef.current?.insertAtCaret(note.id, markdown)) notebook.appendToNote(note.id, markdown);
    });
  }

  function cycleMode() {
    patchPrefs({ mode: MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length] });
  }

  const noteActions: NoteActions | null = current
    ? {
        change: (patch) => updateNote(current.id, patch),
        togglePin: () => updateNote(current.id, { pinned: !current.pinned }),
        move: (folderId) => updateNote(current.id, { folderId }),
        trash: () => trashNote(current),
        restore: () => restoreNote(current),
        copy: () => copyNoteMarkdown(current),
        exportFile: () => downloadNoteMarkdown(current),
        print: () => window.print(),
        openNote: (id) => {
          const note = snapshot.notes.find((item) => item.id === id);
          if (note) revealNote(note);
        },
        openLink,
        createLinkedNote,
        canAttach,
        attachFiles: (files) => attachFiles(current, files),
        showTag: (name) => changeView(`tag:${name}`),
        showFolder: (folderId) => changeView(`folder:${folderId}`),
        back: () => setMobilePane('list')
      }
    : null;

  // Re-registered each render so the shortcuts always see the latest state.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (mod && event.altKey && event.code === 'KeyN') {
        event.preventDefault();
        createNote();
      } else if (mod && event.shiftKey && event.code === 'KeyF' && current && current.deletedAt === null) {
        event.preventDefault();
        setFocusMode((on) => !on);
      } else if (mod && event.key === '/' && current) {
        event.preventDefault();
        cycleMode();
      } else if (event.key === 'Escape' && focusMode && !event.defaultPrevented && !paletteOpen && !folderDialog) {
        setFocusMode(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const listTitle =
    view === 'all'
      ? 'All notes'
      : view === 'pinned'
        ? 'Pinned'
        : inTrash
          ? 'Recently deleted'
          : tag
            ? `#${tag}`
            : (folderNames.get(viewFolderId(view) ?? '') ?? 'Notes');
  const empty = search.trim()
    ? { text: `No results for “${search.trim()}”.`, action: { label: 'Clear search', run: () => setSearch('') } }
    : view === 'pinned'
      ? { text: 'Pinned notes stay at the top.' }
      : inTrash
        ? { text: 'Nothing in Recently deleted.' }
        : tag
          ? { text: `No notes tagged #${tag}.` }
          : { text: view === 'all' ? 'No notes yet.' : 'This folder is empty.', action: { label: 'New note', run: () => createNote() } };

  const sidebar = (
    <NotesSidebar
      view={view}
      onViewChange={changeView}
      counts={{ all: liveNotes.length, pinned: liveNotes.filter((note) => note.pinned).length, trash: snapshot.notes.length - liveNotes.length }}
      folders={folders}
      folderCounts={folderCounts}
      tags={tags}
      onNewNote={() => createNote()}
      onTemplate={createFromTemplate}
      onToday={openToday}
      onNewFolder={() => {
        setNavOpen(false);
        setFolderDialog({ kind: 'create' });
      }}
      onRenameFolder={(folder) => setFolderDialog({ kind: 'rename', folder })}
      onDeleteFolder={(folder) => setFolderDialog({ kind: 'delete', folder })}
      onOpenPalette={() => {
        setNavOpen(false);
        setPaletteOpen(true);
      }}
      account={{ user: notebook.user, syncStatus: notebook.syncStatus, storageError: notebook.storageError }}
    />
  );

  return (
    <>
      <div className='flex h-dvh overflow-hidden bg-background text-foreground print:hidden'>
        {wide && !focusMode ? (
          <aside className='w-[236px] shrink-0 border-r border-sidebar-border'>{sidebar}</aside>
        ) : null}
        {!focusMode ? (
          <NoteList
            className={cn('w-full shrink-0 md:w-[300px] md:border-r md:border-border xl:w-[330px]', showEditorPane && 'max-md:hidden')}
            title={listTitle}
            groups={groupNotes(listNotes, sort, !inTrash)}
            count={listNotes.length}
            selectedId={current?.id ?? null}
            onSelect={(id) => openNoteId(id)}
            search={search}
            onSearchChange={setSearch}
            searchRef={searchRef}
            sort={sort}
            onSortChange={(next) => patchPrefs({ sort: next })}
            folderNames={folderNames}
            showFolders={!viewFolderId(view)}
            empty={empty}
            onNewNote={() => createNote()}
            onOpenNav={() => setNavOpen(true)}
          />
        ) : null}
        <main className={cn('flex min-w-0 flex-1', !showEditorPane && !focusMode && 'max-md:hidden')}>
          {current && noteActions ? (
            <NoteEditor
              note={current}
              notes={snapshot.notes}
              folders={folders}
              mode={mode}
              onModeChange={(next) => patchPrefs({ mode: next })}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode((on) => !on)}
              infoOpen={infoOpen}
              onInfoOpenChange={setInfoOpen}
              editorRef={editorRef}
              titleRef={titleRef}
              actions={noteActions}
            />
          ) : (
            <div className='grid flex-1 place-items-center bg-paper px-6 text-center text-[13.5px] text-muted-foreground'>
              <p>
                Select a note, or press <Kbd>⌥⌘N</Kbd> to start one.
              </p>
            </div>
          )}
        </main>
      </div>

      {!wide ? (
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetContent
            side='left'
            showCloseButton={false}
            className='gap-0 border-sidebar-border p-0 outline-none data-[side=left]:w-[280px]'
            // Focus the panel itself; focusing its first button would pop that button's tooltip.
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (event.currentTarget as HTMLElement).focus();
            }}
          >
            <SheetTitle className='sr-only'>Notebook</SheetTitle>
            <SheetDescription className='sr-only'>Views, folders, and tags.</SheetDescription>
            {sidebar}
          </SheetContent>
        </Sheet>
      ) : null}

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        notes={recentNotes}
        folders={folders}
        tags={tags}
        currentNote={current}
        mode={mode}
        focusMode={focusMode}
        actions={{
          openNote: (id) => {
            const note = snapshot.notes.find((item) => item.id === id);
            if (note) revealNote(note);
          },
          newNote: () => createNote(),
          today: openToday,
          newFolder: () => setFolderDialog({ kind: 'create' }),
          template: createFromTemplate,
          setView: changeView,
          setMode: (next) => patchPrefs({ mode: next }),
          toggleFocus: () => setFocusMode((on) => !on),
          togglePin: () => noteActions?.togglePin(),
          openInfo: () => setInfoOpen(true),
          copy: () => noteActions?.copy(),
          exportFile: () => noteActions?.exportFile(),
          print: () => window.print(),
          trash: () => noteActions?.trash(),
          restore: () => noteActions?.restore()
        }}
      />

      <FolderDialogs
        state={folderDialog}
        onClose={() => setFolderDialog(null)}
        onCreate={(name) => {
          const folder = notebook.createFolder(name);
          patchPrefs({ view: `folder:${folder.id}`, selectedId: null });
          setSearch('');
        }}
        onRename={(folder, name) => notebook.renameFolder(folder.id, name)}
        onDelete={(folder) => notebook.deleteFolder(folder.id)}
      />

      {/* Only the open note is printed (⌘P or "Print or save as PDF"). */}
      {current ? (
        <article className='hidden text-black print:block'>
          <h1 className='mb-6 font-serif text-[28pt] leading-tight font-medium'>{current.title.trim() || 'Untitled'}</h1>
          <MarkdownView content={current.content} />
        </article>
      ) : null}
    </>
  );
}
