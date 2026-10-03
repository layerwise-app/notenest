import { eq, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { db } from '~/db';
import { syncedFolder, syncedNote } from '~/db/schema';
import { auth } from '~/lib/auth';
import type { Note, NoteFolder, NotesSnapshot } from '~/lib/notes';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function parseSnapshot(value: unknown): NotesSnapshot {
  if (!isRecord(value) || !Array.isArray(value.notes) || !Array.isArray(value.folders)) {
    throw new Error('Invalid notes snapshot.');
  }
  if (value.notes.length > 500 || value.folders.length > 100) {
    throw new Error('This notebook is too large to sync.');
  }

  const notes: Note[] = value.notes.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 100 ||
      typeof item.title !== 'string' || item.title.length > 500 ||
      typeof item.content !== 'string' || item.content.length > 200_000 ||
      !(typeof item.folderId === 'string' || item.folderId === null) ||
      (typeof item.folderId === 'string' && item.folderId.length > 100) ||
      typeof item.pinned !== 'boolean' ||
      !isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt) ||
      !(item.deletedAt === null || isTimestamp(item.deletedAt))
    ) {
      throw new Error('Invalid note in sync request.');
    }
    return item as Note;
  });

  const folders: NoteFolder[] = value.folders.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 100 ||
      typeof item.name !== 'string' || item.name.length < 1 || item.name.length > 100 ||
      !isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt) ||
      !(item.deletedAt === null || isTimestamp(item.deletedAt))
    ) {
      throw new Error('Invalid folder in sync request.');
    }
    return item as NoteFolder;
  });

  if (notes.reduce((size, note) => size + note.content.length, 0) > 4_000_000) {
    throw new Error('This notebook is too large to sync.');
  }

  return { notes, folders };
}

const requireUserId = async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error('Sign in to sync your notes.');
  return session.user.id;
};

export const getSyncedNotes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<NotesSnapshot> => {
    const userId = await requireUserId();
    const [notes, folders] = await Promise.all([
      db.select().from(syncedNote).where(eq(syncedNote.userId, userId)),
      db.select().from(syncedFolder).where(eq(syncedFolder.userId, userId))
    ]);

    return {
      notes: notes.map(({ userId: _userId, ...note }) => note),
      folders: folders.map(({ userId: _userId, ...folder }) => folder)
    };
  }
);

export const syncNotes = createServerFn({ method: 'POST' })
  .validator(parseSnapshot)
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const snapshot = data;
    const [existingNotes, existingFolders] = await Promise.all([
      db.select({ id: syncedNote.id, updatedAt: syncedNote.updatedAt })
        .from(syncedNote)
        .where(eq(syncedNote.userId, userId)),
      db.select({ id: syncedFolder.id, updatedAt: syncedFolder.updatedAt })
        .from(syncedFolder)
        .where(eq(syncedFolder.userId, userId))
    ]);
    const noteUpdatedAt = new Map(existingNotes.map((note) => [note.id, note.updatedAt]));
    const folderUpdatedAt = new Map(existingFolders.map((folder) => [folder.id, folder.updatedAt]));
    const noteRows = snapshot.notes
      .filter((note) => (noteUpdatedAt.get(note.id) ?? -1) <= note.updatedAt)
      .map((note) => ({
        ...note,
        userId,
        createdAt: Math.floor(note.createdAt),
        updatedAt: Math.floor(note.updatedAt),
        deletedAt: note.deletedAt === null ? null : Math.floor(note.deletedAt)
      }));
    const folderRows = snapshot.folders
      .filter((folder) => (folderUpdatedAt.get(folder.id) ?? -1) <= folder.updatedAt)
      .map((folder) => ({
        ...folder,
        userId,
        createdAt: Math.floor(folder.createdAt),
        updatedAt: Math.floor(folder.updatedAt),
        deletedAt: folder.deletedAt === null ? null : Math.floor(folder.deletedAt)
      }));

    for (let index = 0; index < noteRows.length; index += 10) {
      await db.insert(syncedNote).values(noteRows.slice(index, index + 10)).onConflictDoUpdate({
        target: [syncedNote.userId, syncedNote.id],
        set: {
          userId,
          title: sql.raw('excluded."title"'),
          content: sql.raw('excluded."content"'),
          folderId: sql.raw('excluded."folder_id"'),
          pinned: sql.raw('excluded."pinned"'),
          createdAt: sql.raw('excluded."created_at"'),
          updatedAt: sql.raw('excluded."updated_at"'),
          deletedAt: sql.raw('excluded."deleted_at"')
        },
        setWhere: sql`${syncedNote.updatedAt} <= excluded."updated_at"`
      });
    }

    for (let index = 0; index < folderRows.length; index += 16) {
      await db.insert(syncedFolder).values(folderRows.slice(index, index + 16)).onConflictDoUpdate({
        target: [syncedFolder.userId, syncedFolder.id],
        set: {
          userId,
          name: sql.raw('excluded."name"'),
          createdAt: sql.raw('excluded."created_at"'),
          updatedAt: sql.raw('excluded."updated_at"'),
          deletedAt: sql.raw('excluded."deleted_at"')
        },
        setWhere: sql`${syncedFolder.updatedAt} <= excluded."updated_at"`
      });
    }

    const [notes, folders] = await Promise.all([
      db.select().from(syncedNote).where(eq(syncedNote.userId, userId)),
      db.select().from(syncedFolder).where(eq(syncedFolder.userId, userId))
    ]);

    return {
      notes: notes.map(({ userId: _userId, ...note }) => note),
      folders: folders.map(({ userId: _userId, ...folder }) => folder)
    } satisfies NotesSnapshot;
  });
