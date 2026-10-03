export type Note = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type NoteFolder = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export type NotesSnapshot = {
  notes: Note[];
  folders: NoteFolder[];
};

export const NOTES_STORAGE_KEY = 'notenest.workspace.v1';
const PREVIEW_CLEANUP_KEY = 'notenest.cleanup-preview-data.v1';

export const initialSnapshot: NotesSnapshot = { notes: [], folders: [] };

const starterNoteIds = new Set([
  'welcome-note',
  'weekend-list',
  'book-notes',
  'recipe-note'
]);

export function readNotesSnapshot(): NotesSnapshot {
  if (typeof window === 'undefined') return initialSnapshot;

  try {
    const saved = window.localStorage.getItem(NOTES_STORAGE_KEY);
    const shouldCleanPreviewData =
      window.localStorage.getItem(PREVIEW_CLEANUP_KEY) !== 'done';
    if (!saved) {
      if (shouldCleanPreviewData) {
        window.localStorage.setItem(PREVIEW_CLEANUP_KEY, 'done');
      }
      return initialSnapshot;
    }
    const parsed = JSON.parse(saved) as Partial<NotesSnapshot>;
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.folders)) {
      return initialSnapshot;
    }
    const notes = parsed.notes;
    const folders = parsed.folders;

    const snapshot = {
      notes: notes.filter(
        (note) =>
          !shouldCleanPreviewData ||
          typeof note?.id !== 'string' ||
          !starterNoteIds.has(note.id)
      ),
      folders: folders.filter((folder) => {
        if (
          !shouldCleanPreviewData ||
          folder?.name !== 'Field Notes' ||
          typeof folder.id !== 'string'
        ) {
          return true;
        }
        return notes.some((note) => note?.folderId === folder.id);
      })
    };

    if (shouldCleanPreviewData) {
      window.localStorage.setItem(PREVIEW_CLEANUP_KEY, 'done');
    }
    return snapshot;
  } catch {
    return initialSnapshot;
  }
}

export function mergeRecords<T extends { id: string; updatedAt: number }>(
  local: T[],
  remote: T[]
): T[] {
  const records = new Map(local.map((record) => [record.id, record]));
  for (const record of remote) {
    const existing = records.get(record.id);
    if (!existing || record.updatedAt > existing.updatedAt) {
      records.set(record.id, record);
    }
  }
  return Array.from(records.values());
}

export function mergeSnapshots(
  local: NotesSnapshot,
  remote: NotesSnapshot
): NotesSnapshot {
  return {
    notes: mergeRecords(local.notes, remote.notes),
    folders: mergeRecords(local.folders, remote.folders)
  };
}

function recordsEqual<T extends { id: string }>(left: T[], right: T[]) {
  if (left.length !== right.length) return false;
  const rightById = new Map(right.map((record) => [record.id, record]));
  return left.every((record) => JSON.stringify(record) === JSON.stringify(rightById.get(record.id)));
}

export function snapshotsEqual(left: NotesSnapshot, right: NotesSnapshot): boolean {
  return recordsEqual(left.notes, right.notes) && recordsEqual(left.folders, right.folders);
}

export function makeNote(title = 'Untitled', folderId: string | null = null): Note {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    content: '',
    folderId,
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}

export function makeFolder(name: string): NoteFolder {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
}
