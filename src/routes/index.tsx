import { useEffect, useRef, useState } from 'react';
import {
  createFileRoute,
  Link
} from '@tanstack/react-router';
import {
  ArchiveRestore,
  ArrowDownUp,
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  Cloud,
  FileText,
  Folder,
  FolderPlus,
  Hash,
  Italic,
  List,
  ListTodo,
  LockKeyhole,
  Menu,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Type,
  X
} from 'lucide-react';
import { useSession, signOut } from '~/lib/auth-client';
import { getSyncedNotes, syncNotes } from '~/lib/notes.functions';
import {
  initialSnapshot,
  makeFolder,
  makeNote,
  mergeSnapshots,
  NOTES_STORAGE_KEY,
  readNotesSnapshot,
  snapshotsEqual
} from '~/lib/notes';
import type { Note, NoteFolder, NotesSnapshot } from '~/lib/notes';
import { seo } from '~/utils/seo';
import '~/styles/notes.css';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      ...seo({
        title: 'Margin — a quieter place to think',
        description: 'A calm, local-first notebook for thoughts, lists, and everything in between.'
      })
    ]
  }),
  component: NotesHome
});

type Filter = 'all' | 'pinned' | 'trash' | `folder:${string}`;
type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'error';
type FolderDialog =
  | { mode: 'create' }
  | { mode: 'rename'; folder: NoteFolder }
  | { mode: 'delete'; folder: NoteFolder }
  | null;

function NotesHome() {
  const { data: session, isPending: isSessionPending } = useSession();
  const user = session?.user;
  const [snapshot, setSnapshot] = useState<NotesSnapshot>(initialSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'write' | 'preview'>('write');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [syncReady, setSyncReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [folderDialog, setFolderDialog] = useState<FolderDialog>(null);
  const [folderName, setFolderName] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [editorOnMobile, setEditorOnMobile] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const snapshotRef = useRef(snapshot);
  const userId = user?.id;

  function applyRemoteSnapshot(remote: NotesSnapshot) {
    const current = snapshotRef.current;
    const merged = mergeSnapshots(current, remote);
    snapshotRef.current = merged;
    if (!snapshotsEqual(current, merged)) setSnapshot(merged);
    return merged;
  }

  useEffect(() => {
    const localSnapshot = readNotesSnapshot();
    setSnapshot(localSnapshot);
    setSelectedNoteId((current) =>
      localSnapshot.notes.some((note) => note.id === current)
        ? current
        : localSnapshot.notes.find((note) => !note.deletedAt)?.id ?? null
    );
    snapshotRef.current = localSnapshot;
    setHydrated(true);
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(snapshot));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [hydrated, snapshot]);

  useEffect(() => {
    if (!hydrated || isSessionPending) return;
    if (!userId) {
      setSyncReady(false);
      setSyncStatus('local');
      return;
    }

    let cancelled = false;
    setSyncReady(false);
    setSyncStatus('loading');

    void getSyncedNotes()
      .then(async (remoteSnapshot) => {
        if (cancelled) return;
        const merged = applyRemoteSnapshot(remoteSnapshot);
        const syncedSnapshot = await syncNotes({ data: merged });
        if (cancelled) return;
        applyRemoteSnapshot(syncedSnapshot);
        setSyncReady(true);
        setSyncStatus('synced');
      })
      .catch(() => {
        if (!cancelled) {
          setSyncReady(true);
          setSyncStatus('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isSessionPending, userId]);

  useEffect(() => {
    if (!userId || !hydrated || !syncReady) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      void syncNotes({ data: snapshot }).then((remoteSnapshot) => {
        applyRemoteSnapshot(remoteSnapshot);
        setSyncStatus('synced');
      }).catch(() => setSyncStatus('error'));
    }, 700);

    return () => window.clearTimeout(timer);
  }, [hydrated, snapshot, syncReady, userId]);

  useEffect(() => {
    if (!userId || !hydrated || !syncReady) return;
    let active = true;
    let inFlight = false;

    const reconcile = async () => {
      if (inFlight) return;
      inFlight = true;
      setSyncStatus('syncing');
      try {
        const remoteSnapshot = await getSyncedNotes();
        if (!active) return;
        const merged = applyRemoteSnapshot(remoteSnapshot);
        const syncedSnapshot = await syncNotes({ data: merged });
        if (!active) return;
        applyRemoteSnapshot(syncedSnapshot);
        setSyncStatus('synced');
      } catch {
        if (active) setSyncStatus('error');
      } finally {
        inFlight = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void reconcile();
    };
    const interval = window.setInterval(() => void reconcile(), 30_000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', reconcile);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', reconcile);
    };
  }, [hydrated, syncReady, userId]);

  const activeNotes = snapshot.notes.filter((note) => {
    if (filter === 'trash') return note.deletedAt !== null;
    if (note.deletedAt !== null) return false;
    if (filter === 'pinned') return note.pinned;
    if (filter.startsWith('folder:')) return note.folderId === filter.slice(7);
    return true;
  });

  const matchedNotes = activeNotes
    .filter((note) => {
      const folder = snapshot.folders.find((item) => item.id === note.folderId);
      const searchable = `${note.title} ${note.content} ${folder?.name ?? ''}`;
      return searchable.toLowerCase().includes(search.trim().toLowerCase());
    })
    .sort((a, b) => {
      const pinOrder = Number(b.pinned) - Number(a.pinned);
      if (pinOrder && filter !== 'trash') return pinOrder;
      return sortNewestFirst ? b.updatedAt - a.updatedAt : a.updatedAt - b.updatedAt;
    });

  const visibleSelectedNoteId = matchedNotes.some((note) => note.id === selectedNoteId)
    ? selectedNoteId
    : matchedNotes[0]?.id ?? null;
  const selectedNote = matchedNotes.find((note) => note.id === visibleSelectedNoteId) ?? null;
  const selectedFolder = filter.startsWith('folder:')
    ? snapshot.folders.find((folder) => folder.id === filter.slice(7)) ?? null
    : null;
  const activeFolders = snapshot.folders.filter((folder) => folder.deletedAt === null);
  const today = new Date().toDateString();
  const todayNotes = matchedNotes.filter((note) => new Date(note.updatedAt).toDateString() === today);
  const earlierNotes = matchedNotes.filter((note) => new Date(note.updatedAt).toDateString() !== today);
  const title = filter === 'all'
    ? 'All notes'
    : filter === 'pinned'
      ? 'Pinned'
      : filter === 'trash'
        ? 'Recently deleted'
        : selectedFolder?.name ?? 'Folder';

  function updateNote(noteId: string, update: Partial<Note>) {
    setSnapshot((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId
          ? { ...note, ...update, updatedAt: Date.now() }
          : note
      )
    }));
  }

  function createNote() {
    const folderId = filter.startsWith('folder:') ? filter.slice(7) : null;
    const note = makeNote('Untitled', folderId);
    setSnapshot((current) => ({ ...current, notes: [note, ...current.notes] }));
    setSelectedNoteId(note.id);
    setFilter(folderId ? `folder:${folderId}` : 'all');
    setViewMode('write');
    setEditorOnMobile(true);
    window.setTimeout(() => titleRef.current?.focus(), 50);
  }

  function createFolder() {
    const cleanName = folderName.trim();
    if (!cleanName) return;
    if (folderDialog?.mode === 'rename') {
      const { folder } = folderDialog;
      setSnapshot((current) => ({
        ...current,
        folders: current.folders.map((item) =>
          item.id === folder.id
            ? { ...item, name: cleanName, updatedAt: Date.now() }
            : item
        )
      }));
    } else {
      const folder = makeFolder(cleanName);
      setSnapshot((current) => ({ ...current, folders: [folder, ...current.folders] }));
      setFilter(`folder:${folder.id}`);
    }
    setFolderName('');
    setFolderDialog(null);
  }

  function deleteFolder(folder: NoteFolder) {
    const now = Date.now();
    setSnapshot((current) => ({
      folders: current.folders.map((item) =>
        item.id === folder.id ? { ...item, deletedAt: now, updatedAt: now } : item
      ),
      notes: current.notes.map((note) =>
        note.folderId === folder.id && note.deletedAt === null
          ? { ...note, folderId: null, updatedAt: now }
          : note
      )
    }));
    if (filter === `folder:${folder.id}`) setFilter('all');
    setFolderDialog(null);
  }

  function togglePin(note: Note) {
    updateNote(note.id, { pinned: !note.pinned });
    setMoreMenuOpen(false);
  }

  function moveNoteToFolder(note: Note, folderId: string | null) {
    updateNote(note.id, { folderId, deletedAt: null });
    setMoreMenuOpen(false);
    setFilter(folderId ? `folder:${folderId}` : 'all');
  }

  function toggleTrash(note: Note) {
    const deletedAt = note.deletedAt === null ? Date.now() : null;
    updateNote(note.id, { deletedAt });
    setMoreMenuOpen(false);
    if (deletedAt) setFilter('trash');
    else setFilter('all');
  }

  function insertMarkdown(prefix: string, suffix = prefix) {
    const textarea = contentRef.current;
    if (!textarea || !selectedNote) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = selectedNote.content.slice(start, end) || 'text';
    const nextContent = `${selectedNote.content.slice(0, start)}${prefix}${selectedText}${suffix}${selectedNote.content.slice(end)}`;
    updateNote(selectedNote.id, { content: nextContent });
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        createNote();
      } else if (command && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('.notes-search-input')?.focus();
      } else if (event.key === 'Escape') {
        setMobileNavOpen(false);
        setMoreMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filter]);

  return (
    <main className='notes-page'>
      <div className='notes-atmosphere notes-atmosphere-one' />
      <div className='notes-atmosphere notes-atmosphere-two' />
      <section
        className={`notes-app${editorOnMobile ? ' is-mobile-editor' : ''}`}
        aria-label='Margin notes workspace'
      >
        {mobileNavOpen ? (
          <button
            aria-label='Close navigation'
            className='notes-mobile-scrim'
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}
        <aside
          className={`notes-sidebar${mobileNavOpen ? ' is-open' : ''}`}
          style={mobileNavOpen ? { transform: 'translateX(0)' } : undefined}
        >
          <div className='notes-brand-row'>
            <div className='notes-brand-mark'><span>m</span></div>
            <div>
              <div className='notes-brand-name'>margin<span>.</span></div>
              <div className='notes-brand-caption'>room for your thoughts</div>
            </div>
            <button
              className='notes-icon-button notes-mobile-close'
              aria-label='Close navigation'
              onClick={() => setMobileNavOpen(false)}
            ><X size={17} /></button>
          </div>

          <button className='notes-new-button' onClick={createNote}>
            <Plus size={17} strokeWidth={2.2} />
            <span>New note</span>
            <kbd>⌘ N</kbd>
          </button>

          <div className='notes-sidebar-section'>
            <div className='notes-section-label'>LIBRARY</div>
            <SidebarItem
              icon={<FileText size={17} />}
              label='All notes'
              count={snapshot.notes.filter((note) => note.deletedAt === null).length}
              active={filter === 'all'}
              onClick={() => { setFilter('all'); setMobileNavOpen(false); }}
            />
            <SidebarItem
              icon={<Pin size={17} />}
              label='Pinned'
              count={snapshot.notes.filter((note) => note.deletedAt === null && note.pinned).length}
              active={filter === 'pinned'}
              onClick={() => { setFilter('pinned'); setMobileNavOpen(false); }}
            />
          </div>

          <div className='notes-sidebar-section notes-folder-section'>
            <div className='notes-section-heading'>
              <div className='notes-section-label'>FOLDERS</div>
              <button
                className='notes-icon-button notes-small-icon-button'
                aria-label='Create folder'
                title='Create folder'
                onClick={() => { setFolderName(''); setFolderDialog({ mode: 'create' }); }}
              ><Plus size={16} /></button>
            </div>
            {activeFolders.length ? activeFolders.map((folder) => {
              const folderFilter = `folder:${folder.id}` as Filter;
              const count = snapshot.notes.filter((note) => note.folderId === folder.id && note.deletedAt === null).length;
              return (
                <div className={`notes-folder-row${filter === folderFilter ? ' is-active' : ''}`} key={folder.id}>
                  <button
                    className='notes-sidebar-item notes-folder-item'
                    onClick={() => { setFilter(folderFilter); setMobileNavOpen(false); }}
                  >
                    <Folder size={17} />
                    <span>{folder.name}</span>
                    <span className='notes-sidebar-count'>{count}</span>
                  </button>
                  <button
                    className='notes-icon-button notes-folder-menu-trigger'
                    aria-label={`Options for ${folder.name}`}
                    title={`Options for ${folder.name}`}
                    onClick={() => { setFolderName(folder.name); setFolderDialog({ mode: 'rename', folder }); }}
                  ><MoreHorizontal size={16} /></button>
                </div>
              );
            }) : (
              <p className='notes-folder-empty'>A folder for every kind of thought.</p>
            )}
            <button
              className='notes-add-folder'
              onClick={() => { setFolderName(''); setFolderDialog({ mode: 'create' }); }}
            ><FolderPlus size={15} /> New folder</button>
          </div>

          <div className='notes-sidebar-bottom'>
            <SidebarItem
              icon={<Trash2 size={17} />}
              label='Recently deleted'
              count={snapshot.notes.filter((note) => note.deletedAt !== null).length}
              active={filter === 'trash'}
              onClick={() => { setFilter('trash'); setMobileNavOpen(false); }}
            />
            <div className='notes-sync-card'>
              <div className='notes-sync-card-icon'><Cloud size={17} /></div>
              <div className='notes-sync-copy'>
                <strong>{user ? 'Your notes, everywhere' : 'Your notes stay yours'}</strong>
                <span>{syncDescription(syncStatus, Boolean(user), storageError)}</span>
              </div>
              {!user ? (
                <Link to='/sign-in' className='notes-sync-link' aria-label='Sign in to sync notes'>
                  <ChevronDown size={15} className='notes-sync-arrow' />
                </Link>
              ) : (
                <span className={`notes-sync-dot is-${syncStatus}`} />
              )}
            </div>
            <div className='notes-user-row'>
              <div className='notes-avatar'>{user ? user.name.slice(0, 1).toUpperCase() : <LockKeyhole size={15} />}</div>
              <div className='notes-user-copy'>
                <strong>{user ? user.name : 'On this device'}</strong>
                <span>{user ? user.email : 'No account needed'}</span>
              </div>
              {user ? (
                <button className='notes-icon-button notes-user-menu' aria-label='Sign out' title='Sign out' onClick={() => void signOut()}>
                  <MoreHorizontal size={17} />
                </button>
              ) : (
                <Link to='/sign-in' className='notes-signin-link'>Sign in</Link>
              )}
            </div>
          </div>
        </aside>

        <section className='notes-list-pane' aria-label='Notes list'>
          <div className='notes-list-topbar'>
            <button
              className='notes-icon-button notes-mobile-menu'
              aria-label='Open navigation'
              onClick={() => setMobileNavOpen(true)}
            ><Menu size={19} /></button>
            <div className='notes-search-wrap'>
              <Search size={16} />
              <input
                className='notes-search-input'
                aria-label='Search notes'
                placeholder='Search notes'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
          </div>
          <div className='notes-list-heading'>
            <div>
              <div className='notes-eyebrow'>{filter === 'trash' ? 'THE ARCHIVE' : selectedFolder ? 'YOUR FOLDER' : 'YOUR NOTEBOOK'}</div>
              <h1>{title}</h1>
            </div>
            <div className='notes-list-heading-actions'>
              <button
                className='notes-icon-button'
                aria-label={sortNewestFirst ? 'Sort oldest first' : 'Sort newest first'}
                title={sortNewestFirst ? 'Sort oldest first' : 'Sort newest first'}
                onClick={() => setSortNewestFirst((value) => !value)}
              ><ArrowDownUp size={17} /></button>
              <button className='notes-icon-button notes-add-note-icon' aria-label='Create note' title='Create note' onClick={createNote}>
                <Plus size={19} />
              </button>
            </div>
          </div>
          <div className='notes-list-count'>{matchedNotes.length} {matchedNotes.length === 1 ? 'note' : 'notes'}</div>
          <div className='notes-list-scroll'>
            {matchedNotes.length ? (
              <>
                {todayNotes.length ? <div className='notes-date-divider'>TODAY</div> : null}
                {todayNotes.map((note) => (
                  <NoteListItem key={note.id} note={note} selected={visibleSelectedNoteId === note.id} onClick={() => { setSelectedNoteId(note.id); setEditorOnMobile(true); }} />
                ))}
                {earlierNotes.length ? <div className='notes-date-divider'>{todayNotes.length ? 'EARLIER' : 'RECENT'}</div> : null}
                {earlierNotes.map((note) => (
                  <NoteListItem key={note.id} note={note} selected={visibleSelectedNoteId === note.id} onClick={() => { setSelectedNoteId(note.id); setEditorOnMobile(true); }} />
                ))}
              </>
            ) : (
              <div className='notes-list-empty'>
                <div className='notes-empty-icon'>{filter === 'trash' ? <Trash2 size={21} /> : <Search size={21} />}</div>
                <strong>{search ? 'Nothing found' : filter === 'trash' ? 'Nothing in the bin' : 'A little quiet here'}</strong>
                <span>{search ? 'Try another word or phrase.' : filter === 'trash' ? 'Deleted notes will stay here for a while.' : 'Your notes will find a home here.'}</span>
                {!search && filter !== 'trash' ? <button onClick={createNote}><Plus size={15} /> Write a note</button> : null}
              </div>
            )}
          </div>
          <div className='notes-list-footer'><span>PRIVATE BY DESIGN</span><LockKeyhole size={12} /></div>
        </section>

        <section className='notes-editor-pane' aria-label='Note editor'>
          {selectedNote ? (
            <>
              <div className='notes-editor-toolbar'>
                <div className='notes-editor-leading'>
                  <button className='notes-icon-button notes-mobile-back' aria-label='Back to notes' onClick={() => setEditorOnMobile(false)}>
                    <ArrowLeft size={18} />
                  </button>
                  <button className='notes-icon-button notes-editor-nav' aria-label='Open navigation' onClick={() => setMobileNavOpen(true)}>
                    <Menu size={18} />
                  </button>
                  <div className='notes-breadcrumb'>
                    <span>{selectedNote.deletedAt ? 'Recently deleted' : selectedNote.folderId ? snapshot.folders.find((folder) => folder.id === selectedNote.folderId)?.name ?? 'All notes' : 'All notes'}</span>
                    <span className='notes-breadcrumb-separator'>/</span>
                    <span className='notes-breadcrumb-current'>{selectedNote.title || 'Untitled'}</span>
                  </div>
                </div>
                <div className='notes-editor-actions'>
                  <span className={`notes-save-status${syncStatus === 'error' || storageError ? ' is-error' : ''}`}>
                    <span className={`notes-status-dot is-${storageError ? 'error' : syncStatus}`} />
                    <span>{storageError ? 'Storage is full' : syncStatusLabel(syncStatus, Boolean(user))}</span>
                  </span>
                  <div className='notes-toolbar-divider' />
                  <button
                    className={`notes-icon-button${selectedNote.pinned ? ' is-pinned' : ''}`}
                    aria-label={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                    title={selectedNote.pinned ? 'Unpin note' : 'Pin note'}
                    onClick={() => togglePin(selectedNote)}
                  ><Pin size={17} fill={selectedNote.pinned ? 'currentColor' : 'none'} /></button>
                  <div className='notes-more-wrap'>
                    <button className='notes-icon-button' aria-label='More note actions' title='More actions' onClick={() => setMoreMenuOpen((open) => !open)}>
                      <MoreHorizontal size={19} />
                    </button>
                    {moreMenuOpen ? (
                      <div className='notes-action-menu'>
                        <button onClick={() => togglePin(selectedNote)}><Pin size={15} /> {selectedNote.pinned ? 'Unpin note' : 'Pin note'}</button>
                        <div className='notes-menu-separator' />
                        <div className='notes-menu-label'>MOVE TO FOLDER</div>
                        <button onClick={() => moveNoteToFolder(selectedNote, null)}><FileText size={15} /> All notes</button>
                        {activeFolders.map((folder) => (
                          <button key={folder.id} onClick={() => moveNoteToFolder(selectedNote, folder.id)}><Folder size={15} /> {folder.name}</button>
                        ))}
                        <div className='notes-menu-separator' />
                        <button className='notes-menu-danger' onClick={() => toggleTrash(selectedNote)}>
                          {selectedNote.deletedAt ? <ArchiveRestore size={15} /> : <Trash2 size={15} />}
                          {selectedNote.deletedAt ? 'Restore note' : 'Move to recently deleted'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className='notes-editor-scroll' onClick={() => setMoreMenuOpen(false)}>
                <div className='notes-paper'>
                  <div className='notes-paper-meta'>
                    <span>{formatFullDate(selectedNote.updatedAt)}</span>
                    <span className='notes-paper-meta-dot' />
                    <span>{wordCount(selectedNote.content)} words</span>
                  </div>
                  {viewMode === 'write' ? (
                    <>
                      <input
                        ref={titleRef}
                        className='notes-title-input'
                        aria-label='Note title'
                        placeholder='Untitled'
                        maxLength={500}
                        value={selectedNote.title}
                        onChange={(event) => updateNote(selectedNote.id, { title: event.target.value })}
                      />
                      <textarea
                        ref={contentRef}
                        className='notes-content-input'
                        aria-label='Note content in Markdown'
                        placeholder={'Start with a thought...\n\nWrite in Markdown. Your words are saved as you go.'}
                        maxLength={200_000}
                        value={selectedNote.content}
                        onChange={(event) => updateNote(selectedNote.id, { content: event.target.value })}
                        spellCheck
                      />
                    </>
                  ) : (
                    <>
                      <h2 className='notes-preview-title'>{selectedNote.title || 'Untitled'}</h2>
                      <MarkdownPreview content={selectedNote.content} />
                    </>
                  )}
                </div>
              </div>

              <div className='notes-editor-footer'>
                {viewMode === 'write' ? (
                  <div className='notes-format-tools' aria-label='Markdown formatting'>
                    <button title='Bold' aria-label='Insert bold Markdown' onClick={() => insertMarkdown('**')}><Bold size={16} /></button>
                    <button title='Italic' aria-label='Insert italic Markdown' onClick={() => insertMarkdown('*')}><Italic size={16} /></button>
                    <span />
                    <button title='Heading' aria-label='Insert heading Markdown' onClick={() => insertMarkdown('## ', '')}><Type size={16} /></button>
                    <button title='Bullet list' aria-label='Insert bullet list Markdown' onClick={() => insertMarkdown('- ', '')}><List size={16} /></button>
                    <button title='Task list' aria-label='Insert task list Markdown' onClick={() => insertMarkdown('- [ ] ', '')}><ListTodo size={16} /></button>
                  </div>
                ) : <div className='notes-markdown-hint'><Hash size={14} /> Markdown preview</div>}
                <div className='notes-view-toggle' role='group' aria-label='Editor view'>
                  <button className={viewMode === 'write' ? 'is-active' : ''} onClick={() => setViewMode('write')}>Write</button>
                  <button className={viewMode === 'preview' ? 'is-active' : ''} onClick={() => setViewMode('preview')}>Preview</button>
                </div>
              </div>
            </>
          ) : (
            <div className='notes-editor-empty'>
              <div className='notes-empty-illustration'><Sparkles size={24} /></div>
              <div className='notes-editor-empty-eyebrow'>A FRESH PAGE</div>
              <h2>Make room for a thought.</h2>
              <p>Every good idea starts somewhere. This one can start here.</p>
              <button className='notes-empty-create' onClick={createNote}><Plus size={16} /> Write a note <kbd>⌘ N</kbd></button>
            </div>
          )}
        </section>
      </section>
      <div className='notes-outside-caption'>A small, quiet place for everything on your mind.</div>

      {folderDialog ? (
        <div className='notes-dialog-backdrop' role='presentation' onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFolderDialog(null);
        }}>
          <div className='notes-dialog' role='dialog' aria-modal='true' aria-labelledby='folder-dialog-title'>
            <button className='notes-icon-button notes-dialog-close' aria-label='Close dialog' onClick={() => setFolderDialog(null)}><X size={17} /></button>
            {folderDialog.mode === 'delete' ? (
              <>
                <div className='notes-dialog-icon is-danger'><Trash2 size={19} /></div>
                <h2 id='folder-dialog-title'>Delete this folder?</h2>
                <p>Notes inside “{folderDialog.folder.name}” will be moved to All notes. Your writing won’t be deleted.</p>
                <div className='notes-dialog-actions'>
                  <button className='notes-dialog-secondary' onClick={() => setFolderDialog(null)}>Keep folder</button>
                  <button className='notes-dialog-danger' onClick={() => deleteFolder(folderDialog.folder)}>Delete folder</button>
                </div>
              </>
            ) : (
              <>
                <div className='notes-dialog-icon'><FolderPlus size={19} /></div>
                <h2 id='folder-dialog-title'>{folderDialog.mode === 'rename' ? 'Give it a new name' : 'Make a little space'}</h2>
                <p>{folderDialog.mode === 'rename' ? 'A folder can always become something else.' : 'Create a folder to gather a few related thoughts.'}</p>
                <form onSubmit={(event) => { event.preventDefault(); createFolder(); }}>
                  <label htmlFor='folder-name'>Folder name</label>
                  <input
                    id='folder-name'
                    autoFocus
                    maxLength={100}
                    placeholder='e.g. Little ideas'
                    value={folderName}
                    onChange={(event) => setFolderName(event.target.value)}
                  />
                  <div className='notes-dialog-actions'>
                    {folderDialog.mode === 'rename' ? (
                      <button type='button' className='notes-dialog-delete-link' onClick={() => setFolderDialog({ mode: 'delete', folder: folderDialog.folder })}>Delete folder</button>
                    ) : <span />}
                    <button type='button' className='notes-dialog-secondary' onClick={() => setFolderDialog(null)}>Cancel</button>
                    <button type='submit' className='notes-dialog-primary' disabled={!folderName.trim()}>
                      {folderDialog.mode === 'rename' ? 'Save name' : 'Create folder'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`notes-sidebar-item${active ? ' is-active' : ''}`} onClick={onClick}>
      {icon}<span>{label}</span><span className='notes-sidebar-count'>{count}</span>
    </button>
  );
}

function NoteListItem({ note, selected, onClick }: { note: Note; selected: boolean; onClick: () => void }) {
  return (
    <button className={`notes-list-item${selected ? ' is-selected' : ''}`} onClick={onClick}>
      <div className='notes-list-item-title-row'>
        <span className={`notes-list-item-title${note.title ? '' : ' is-untitled'}`}>{note.title || 'Untitled'}</span>
        {note.pinned ? <Pin className='notes-list-pin' size={13} fill='currentColor' /> : null}
      </div>
      <p>{plainText(note.content) || 'No additional text'}</p>
      <div className='notes-list-item-meta'>
        <span>{formatShortDate(note.updatedAt)}</span>
        {note.deletedAt ? <span className='notes-list-trash-tag'>Deleted</span> : null}
      </div>
    </button>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const HeadingTag = `h${Math.min(heading[1].length, 4)}` as 'h1' | 'h2' | 'h3' | 'h4';
      blocks.push(<HeadingTag key={index}>{inlineMarkdown(heading[2])}</HeadingTag>);
      index += 1;
      continue;
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      blocks.push(<hr key={index} />);
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{quoteLines.map((quoteLine, quoteIndex) => <p key={quoteIndex}>{inlineMarkdown(quoteLine)}</p>)}</blockquote>);
      continue;
    }

    const listMatch = /^\s*(?:[-*+]\s+|\d+\.\s+)(.*)$/.exec(line);
    if (listMatch) {
      const listLines: string[] = [];
      const ordered = /^\s*\d+\.\s+/.test(line);
      while (index < lines.length && /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[index])) {
        listLines.push(lines[index].replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/, ''));
        index += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={`list-${index}`}>
          {listLines.map((item, itemIndex) => {
            const task = /^\[([ xX])\]\s*(.*)$/.exec(item);
            return (
              <li className={task?.[1].toLowerCase() === 'x' ? 'is-checked' : ''} key={itemIndex}>
                {task ? <><span className='notes-task-checkbox'>{task[1].trim() ? <Check size={11} /> : null}</span>{inlineMarkdown(task[2])}</> : inlineMarkdown(item)}
              </li>
            );
          })}
        </ListTag>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,4})\s+/.test(lines[index]) && !/^>\s?/.test(lines[index]) && !/^\s*(?:[-*+]\s+|\d+\.\s+)/.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`}>{paragraph.map((text, lineIndex) => <span key={lineIndex}>{lineIndex ? <br /> : null}{inlineMarkdown(text)}</span>)}</p>);
  }

  return <div className='notes-markdown-preview'>{blocks.length ? blocks : <p className='notes-preview-empty'>Nothing to preview just yet.</p>}</div>;
}

function inlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|~~[^~]+~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key++}>{token.slice(2, -2)}</del>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function syncDescription(status: SyncStatus, hasUser: boolean, storageError: boolean) {
  if (storageError) return 'Local storage is full';
  if (!hasUser) return 'Saved only on this device';
  if (status === 'loading') return 'Finding your notebook…';
  if (status === 'syncing') return 'Syncing your notes…';
  if (status === 'error') return 'Sync paused · notes stay here';
  return 'Up to date on your devices';
}

function syncStatusLabel(status: SyncStatus, hasUser: boolean) {
  if (!hasUser || status === 'local') return 'Saved on this device';
  if (status === 'loading') return 'Loading notes';
  if (status === 'syncing') return 'Syncing';
  if (status === 'error') return 'Sync paused';
  return 'All changes saved';
}

function plainText(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]\s+|\d+\.\s+)/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(content: string) {
  const words = content.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function formatShortDate(timestamp: number) {
  const date = new Date(timestamp);
  if (date.toDateString() === new Date().toDateString()) {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  if (date.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function formatFullDate(timestamp: number) {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(new Date(timestamp));
}
