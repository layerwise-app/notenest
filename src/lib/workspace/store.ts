// The browser's copy of the workspace: every page, kept in IndexedDB so it
// works offline, and synced to the account when signed in (see sync.ts).
// Components read it with `useWorkspace(selector)`; changes go through the
// actions below so persistence and sync see them.
import { createStore as createIdbStore, delMany, entries, setMany } from 'idb-keyval';
import { create } from 'zustand';
import { makePage } from '~/lib/pages/page';
import type { LegacyFolder, Page, PageRecord } from '~/lib/pages/page';
import { upgradeRecords } from '~/lib/pages/sync';
import type { PagesById } from '~/lib/pages/tree';

export type SyncStatus = 'local' | 'loading' | 'syncing' | 'synced' | 'error';

type WorkspaceState = {
  hydrated: boolean;
  pages: PagesById;
  syncStatus: SyncStatus;
  /** True when the browser refused to save locally (private mode, full disk). */
  storageError: boolean;
};

export const useWorkspace = create<WorkspaceState>()(() => ({
  hydrated: false,
  pages: {},
  syncStatus: 'local',
  storageError: false
}));

const LEGACY_KEY = 'notenest.workspace.v1';
const META_KEY = 'notenest.workspace-meta.v2';

type Meta = { ownerId: string | null; legacyImported: boolean };

export function readMeta(): Meta {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(META_KEY) ?? 'null') as Partial<Meta> | null;
    return { ownerId: typeof parsed?.ownerId === 'string' ? parsed.ownerId : null, legacyImported: parsed?.legacyImported === true };
  } catch {
    return { ownerId: null, legacyImported: false };
  }
}

export function writeMeta(patch: Partial<Meta>) {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify({ ...readMeta(), ...patch }));
  } catch {
    // Meta is rebuilt from defaults; the worst case is a repeated import check.
  }
}

let idb: ReturnType<typeof createIdbStore> | null = null;
const pagesDb = () => (idb ??= createIdbStore('notenest-pages', 'pages'));

// --- Change listeners (persistence and sync subscribe here) -------------

type ChangeListener = (ids: string[], source: 'local' | 'remote') => void;
const listeners = new Set<ChangeListener>();

export function onPagesChanged(listener: ChangeListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: Page[], source: 'local' | 'remote') {
  if (!next.length) return;
  useWorkspace.setState((state) => {
    const pages = { ...state.pages };
    for (const page of next) pages[page.id] = page;
    return { pages };
  });
  const ids = next.map((page) => page.id);
  for (const listener of listeners) listener(ids, source);
}

// --- Persistence ---------------------------------------------------------

const unsaved = new Set<string>();
let saveTimer: number | undefined;

function scheduleSave(ids: string[]) {
  for (const id of ids) unsaved.add(id);
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void flushSave(), 250);
}

async function flushSave() {
  window.clearTimeout(saveTimer);
  if (!unsaved.size) return;
  const ids = [...unsaved];
  unsaved.clear();
  const { pages } = useWorkspace.getState();
  try {
    await setMany(
      ids.flatMap((id) => (pages[id] ? [[id, pages[id]] as [string, Page]] : [])),
      pagesDb()
    );
    if (useWorkspace.getState().storageError) useWorkspace.setState({ storageError: false });
  } catch {
    for (const id of ids) unsaved.add(id);
    useWorkspace.setState({ storageError: true });
  }
}

/** Loads the workspace from IndexedDB, importing the Markdown notebook once. */
export async function hydrateWorkspace() {
  if (useWorkspace.getState().hydrated) return;
  let stored: Page[] = [];
  try {
    stored = (await entries<string, Page>(pagesDb())).map(([, page]) => page);
  } catch {
    useWorkspace.setState({ storageError: true });
  }

  const meta = readMeta();
  if (!meta.legacyImported) {
    const legacy = await importLegacyNotebook(new Set(stored.map((page) => page.id)));
    stored = [...stored, ...legacy];
    if (legacy.length) {
      try {
        await setMany(legacy.map((page) => [page.id, page]), pagesDb());
      } catch {
        useWorkspace.setState({ storageError: true });
      }
    }
    writeMeta({ legacyImported: true });
  }

  useWorkspace.setState({ hydrated: true, pages: Object.fromEntries(stored.map((page) => [page.id, page])) });
  onPagesChanged((ids) => scheduleSave(ids));
  window.addEventListener('pagehide', () => void flushSave());
}

type LegacyNote = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

/** Pages from the Markdown notebook this browser kept in localStorage. */
async function importLegacyNotebook(existing: Set<string>): Promise<Page[]> {
  let snapshot: { notes?: LegacyNote[]; folders?: LegacyFolder[] } | null = null;
  try {
    snapshot = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? 'null');
  } catch {
    return [];
  }
  const notes = Array.isArray(snapshot?.notes) ? snapshot.notes : [];
  const folders = Array.isArray(snapshot?.folders) ? snapshot.folders : [];
  if (!notes.length && !folders.length) return [];
  const records = notes
    .filter((note) => typeof note?.id === 'string' && !existing.has(note.id))
    .map((note) => legacyNoteRecord(note));
  return (await upgradeLegacy(records, folders.filter((folder) => !existing.has(folder.id)))).pages;
}

export function legacyNoteRecord(note: LegacyNote): PageRecord {
  return {
    ...makePage({
      id: note.id,
      title: String(note.title ?? ''),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      deletedAt: note.deletedAt ?? null,
      favorite: Boolean(note.pinned),
      position: 0
    }),
    content: String(note.content ?? ''),
    folderId: note.folderId ?? null
  };
}

/** Converts notebook rows, loading the Markdown parser only when needed. */
export async function upgradeLegacy(records: PageRecord[], folders: LegacyFolder[]) {
  const needsParser = records.some((record) => record.content && !record.content.startsWith('{"type":"doc"'));
  const toDoc = needsParser
    ? (await import('~/components/editor/markdown')).createMarkdownToDoc(records)
    : () => '';
  return upgradeRecords(records, folders, toDoc);
}

// --- Reading -------------------------------------------------------------

export const getPages = () => useWorkspace.getState().pages;
export const getPage = (id: string): Page | undefined => useWorkspace.getState().pages[id];

// --- Writing -------------------------------------------------------------

export function updatePage(id: string, patch: Partial<Omit<Page, 'id'>>) {
  const page = getPage(id);
  if (!page) return;
  commit([{ ...page, ...patch, updatedAt: Math.max(Date.now(), page.updatedAt + 1) }], 'local');
}

export function updatePages(patches: { id: string; patch: Partial<Omit<Page, 'id'>> }[]) {
  const now = Date.now();
  commit(
    patches.flatMap(({ id, patch }) => {
      const page = getPage(id);
      return page ? [{ ...page, ...patch, updatedAt: Math.max(now, page.updatedAt + 1) }] : [];
    }),
    'local'
  );
}

export function insertPages(pages: Page[]) {
  commit(pages, 'local');
}

/** Applies pages from the server without marking them for another push. */
export function applyRemotePages(pages: Page[]) {
  commit(pages, 'remote');
}

/** Empties the local copy, for sign-out or a different account signing in. */
export async function resetWorkspace() {
  window.clearTimeout(saveTimer);
  unsaved.clear();
  useWorkspace.setState({ pages: {} });
  try {
    const ids = (await entries<string, Page>(pagesDb())).map(([id]) => id);
    await delMany(ids, pagesDb());
  } catch {
    useWorkspace.setState({ storageError: true });
  }
}

export const flushLocalSave = flushSave;
