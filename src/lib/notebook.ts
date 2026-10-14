// Pure queries over a notebook snapshot: which notes a sidebar view shows,
// how they're searched, sorted, and grouped in the list.
import { extractTags, hasTag } from './note-text.ts';
import type { Note, NoteFolder } from './notes.ts';

export type NotesView = 'all' | 'pinned' | 'trash' | `folder:${string}` | `tag:${string}`;
export type SortKey = 'edited' | 'created' | 'title';

export const SORT_LABELS: Record<SortKey, string> = {
  edited: 'Date edited',
  created: 'Date created',
  title: 'Title'
};

export function viewFolderId(view: NotesView) {
  return view.startsWith('folder:') ? view.slice(7) : null;
}

export function viewTag(view: NotesView) {
  return view.startsWith('tag:') ? view.slice(4) : null;
}

export function notesInView(notes: Note[], view: NotesView) {
  if (view === 'trash') return notes.filter((note) => note.deletedAt !== null);
  const live = notes.filter((note) => note.deletedAt === null);
  if (view === 'pinned') return live.filter((note) => note.pinned);
  const folderId = viewFolderId(view);
  if (folderId) return live.filter((note) => note.folderId === folderId);
  const tag = viewTag(view);
  if (tag) return live.filter((note) => hasTag(extractTags(note.content), tag));
  return live;
}

/** Every whitespace-separated term must appear in the title, body, or folder name. */
export function searchNotes(notes: Note[], query: string, folders: NoteFolder[]) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return notes;
  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));
  return notes.filter((note) => {
    const haystack = `${note.title}\n${note.content}\n${folderNames.get(note.folderId ?? '') ?? ''}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function sortNotes(notes: Note[], sort: SortKey, pinnedFirst = true) {
  return [...notes].sort((a, b) => {
    if (pinnedFirst && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === 'title') {
      return (a.title || 'Untitled').localeCompare(b.title || 'Untitled', undefined, { sensitivity: 'base' });
    }
    return sort === 'created' ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt;
  });
}

export type NoteGroup = { label: string; notes: Note[] };

const monthFormat = new Intl.DateTimeFormat('en', { month: 'long' });
const monthYearFormat = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

function dateBucket(timestamp: number, now: Date) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  if (timestamp >= startOfToday) return 'Today';
  if (timestamp >= startOfToday - day) return 'Yesterday';
  if (timestamp >= startOfToday - 7 * day) return 'Previous 7 days';
  if (timestamp >= startOfToday - 30 * day) return 'Previous 30 days';
  const date = new Date(timestamp);
  return date.getFullYear() === now.getFullYear() ? monthFormat.format(date) : monthYearFormat.format(date);
}

/** Groups an already-sorted list into Pinned plus date sections (Apple Notes style). */
export function groupNotes(notes: Note[], sort: SortKey, pinnedFirst: boolean, now = new Date()): NoteGroup[] {
  const groups: NoteGroup[] = [];
  const push = (label: string, note: Note) => {
    const last = groups[groups.length - 1];
    if (last?.label === label) last.notes.push(note);
    else groups.push({ label, notes: [note] });
  };
  const titleLabel = pinnedFirst && notes.some((note) => note.pinned) ? 'Notes' : '';
  for (const note of notes) {
    if (pinnedFirst && note.pinned) push('Pinned', note);
    else if (sort === 'title') push(titleLabel, note);
    else push(dateBucket(sort === 'created' ? note.createdAt : note.updatedAt, now), note);
  }
  return groups;
}
