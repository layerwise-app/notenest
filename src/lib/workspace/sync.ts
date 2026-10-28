// Keeps the local workspace and the signed-in account in step: local edits
// are pushed shortly after they happen, and the account is pulled on start,
// every 30 seconds, and when the tab regains focus. Last write wins per page.
import { toast } from 'sonner';
import { pullPages, pushPages } from '~/lib/pages.functions';
import type { Page } from '~/lib/pages/page';
import { MAX_PAGE_CONTENT, newerRemotePages, pagesToPush, pushBatches } from '~/lib/pages/sync';
import { flushEditors } from '~/lib/workspace/editors';
import {
  applyRemotePages,
  flushLocalSave,
  getPage,
  getPages,
  onPagesChanged,
  readMeta,
  resetWorkspace,
  upgradeLegacy,
  useWorkspace,
  writeMeta
} from '~/lib/workspace/store';

let userId: string | null = null;
const dirty = new Set<string>();
let pushTimer: number | undefined;
let retryTimer: number | undefined;
let pushing: Promise<void> | null = null;
let reconciling = false;
let stopListeners: (() => void) | null = null;
const warnedOversize = new Set<string>();

const setStatus = (syncStatus: ReturnType<typeof useWorkspace.getState>['syncStatus']) => {
  if (useWorkspace.getState().syncStatus !== syncStatus) useWorkspace.setState({ syncStatus });
};

onPagesChanged((ids, source) => {
  if (source !== 'local') return;
  for (const id of ids) dirty.add(id);
  if (!userId) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void pushDirty(), 800);
});

/** Starts syncing for a signed-in user; a different account replaces local pages. */
export async function startSync(id: string) {
  if (userId === id) return;
  const { ownerId } = readMeta();
  if (ownerId && ownerId !== id) await resetWorkspace();
  writeMeta({ ownerId: id });
  userId = id;
  setStatus('loading');
  await reconcile();

  const onFocus = () => void reconcile();
  const onVisibility = () => {
    if (document.visibilityState === 'visible') void reconcile();
    else {
      flushEditors();
      void pushDirty();
    }
  };
  const interval = window.setInterval(() => void reconcile(), 30_000);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  stopListeners = () => {
    window.clearInterval(interval);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** Stops syncing (the session ended); local pages stay. */
export function stopSync() {
  userId = null;
  stopListeners?.();
  stopListeners = null;
  window.clearTimeout(pushTimer);
  window.clearTimeout(retryTimer);
  setStatus('local');
}

/** Pushes every unsaved edit, then clears this browser's copy for sign-out. */
export async function prepareSignOut() {
  flushEditors();
  await pushDirty();
  if (dirty.size) throw new Error('Some changes haven’t synced yet. Check your connection and try again.');
  stopSync();
  await flushLocalSave();
  await resetWorkspace();
  writeMeta({ ownerId: null });
}

async function reconcile() {
  if (!userId || reconciling) return;
  reconciling = true;
  try {
    const remote = await pullPages();
    if (!userId) return;
    const { pages: remotePages, upgraded } = await upgradeLegacy(remote.pages, remote.folders);
    applyRemotePages(newerRemotePages(getPages(), remotePages));
    for (const page of pagesToPush(getPages(), remotePages)) dirty.add(page.id);
    // Rows converted from the Markdown notebook are written back in page form.
    for (const page of upgraded) {
      const local = getPage(page.id);
      if (local && local.updatedAt === page.updatedAt) dirty.add(page.id);
    }
    await pushDirty();
    if (!dirty.size) setStatus('synced');
  } catch {
    setStatus('error');
  } finally {
    reconciling = false;
  }
}

function pushDirty(): Promise<void> {
  if (!userId) return Promise.resolve();
  // One push at a time; a call during a push waits for it, then sends what's left.
  if (pushing) return pushing.then(() => pushDirty());
  window.clearTimeout(pushTimer);
  window.clearTimeout(retryTimer);
  // Assigned before it can settle, so `finally` always clears this push.
  const run = pushLoop().finally(() => {
    if (pushing === run) pushing = null;
  });
  pushing = run;
  return run;
}

async function pushLoop() {
  // Let the caller's `pushing` assignment happen before anything settles.
  await Promise.resolve();
  try {
    while (dirty.size && userId) {
      setStatus('syncing');
      const ids = [...dirty];
      dirty.clear();
      const pages: Page[] = [];
      for (const id of ids) {
        const page = getPage(id);
        if (!page) continue;
        if (page.content.length > MAX_PAGE_CONTENT) {
          if (!warnedOversize.has(id)) {
            warnedOversize.add(id);
            toast.error(`“${page.title || 'Untitled'}” is too large to sync. Split it into smaller pages.`);
          }
          continue;
        }
        pages.push(page);
      }
      const batches = pushBatches(pages);
      for (const [index, batch] of batches.entries()) {
        try {
          const { newer } = await pushPages({ data: { pages: batch } });
          const { pages: newerPages } = await upgradeLegacy(newer, []);
          applyRemotePages(newerRemotePages(getPages(), newerPages));
        } catch (error) {
          // Keep this batch and the ones after it for the retry.
          for (const page of batches.slice(index).flat()) dirty.add(page.id);
          throw error;
        }
      }
    }
    if (userId) setStatus('synced');
  } catch {
    setStatus('error');
    retryTimer = window.setTimeout(() => void pushDirty(), 10_000);
  }
}
