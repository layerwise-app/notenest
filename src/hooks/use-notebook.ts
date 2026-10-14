// Owns the notebook snapshot: loads it from localStorage, saves every change
// back, and (when signed in) merges it with the server copy.
import { useEffect, useRef, useState } from 'react';
import { useSession } from '~/lib/auth-client';
import { getSyncedNotes, syncNotes } from '~/lib/notes.functions';
import {
  initialSnapshot,
  makeFolder,
  mergeSnapshots,
  NOTES_STORAGE_KEY,
  readNotesSnapshot,
  snapshotsEqual
} from '~/lib/notes';
import type { Note, NoteFolder, NotesSnapshot } from '~/lib/notes';

export type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'error';

export function useNotebook() {
  const { data: session, isPending: isSessionPending, refetch: refetchSession } = useSession();
  const user = session?.user ?? null;
  const userId = user?.id;
  const [snapshot, setSnapshot] = useState<NotesSnapshot>(initialSnapshot);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [syncReady, setSyncReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const snapshotRef = useRef(snapshot);

  function applyRemoteSnapshot(remote: NotesSnapshot) {
    const current = snapshotRef.current;
    const merged = mergeSnapshots(current, remote);
    snapshotRef.current = merged;
    if (!snapshotsEqual(current, merged)) setSnapshot(merged);
    return merged;
  }

  // A failed sync can mean the session ended elsewhere (signed out, or revoked
  // when the email was first verified on another device). Re-checking it drops
  // the sidebar back to "Sign in" instead of a stale signed-in state.
  function failSync() {
    setSyncStatus('error');
    void refetchSession();
  }

  useEffect(() => {
    const localSnapshot = readNotesSnapshot();
    snapshotRef.current = localSnapshot;
    setSnapshot(localSnapshot);
    setHydrated(true);
  }, []);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    if (!hydrated) return;
    let failed = false;
    try {
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      failed = true;
    }
    // Only set state when the result flips. A same-value update after every
    // keystroke queues an extra render and, during fast typing, trips React's
    // nested-update limit (dropping characters).
    if (failed !== storageError) setStorageError(failed);
  }, [hydrated, snapshot, storageError]);

  // First sync after sign-in: pull, merge, push the merged result.
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
          failSync();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, isSessionPending, userId]);

  // Push local edits shortly after typing stops.
  useEffect(() => {
    if (!userId || !hydrated || !syncReady) return;
    const timer = window.setTimeout(() => {
      setSyncStatus('syncing');
      void syncNotes({ data: snapshot })
        .then((remoteSnapshot) => {
          applyRemoteSnapshot(remoteSnapshot);
          setSyncStatus('synced');
        })
        .catch(failSync);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [hydrated, snapshot, syncReady, userId]);

  // Pick up edits from other devices periodically and when the tab regains focus.
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
        if (active) failSync();
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

  function updateNote(noteId: string, patch: Partial<Omit<Note, 'id'>>) {
    setSnapshot((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === noteId ? { ...note, ...patch, updatedAt: Date.now() } : note
      )
    }));
  }

  function addNote(note: Note) {
    setSnapshot((current) => ({ ...current, notes: [note, ...current.notes] }));
  }

  function createFolder(name: string): NoteFolder {
    const folder = makeFolder(name);
    setSnapshot((current) => ({ ...current, folders: [folder, ...current.folders] }));
    return folder;
  }

  function renameFolder(folderId: string, name: string) {
    setSnapshot((current) => ({
      ...current,
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name, updatedAt: Date.now() } : folder
      )
    }));
  }

  /** Soft-deletes a folder and moves its notes back to All notes. */
  function deleteFolder(folderId: string) {
    const now = Date.now();
    setSnapshot((current) => ({
      folders: current.folders.map((folder) =>
        folder.id === folderId ? { ...folder, deletedAt: now, updatedAt: now } : folder
      ),
      notes: current.notes.map((note) =>
        note.folderId === folderId ? { ...note, folderId: null, updatedAt: now } : note
      )
    }));
  }

  return {
    snapshot,
    hydrated,
    user,
    isSessionPending,
    syncStatus,
    storageError,
    updateNote,
    addNote,
    createFolder,
    renameFolder,
    deleteFolder
  };
}

export type Notebook = ReturnType<typeof useNotebook>;
