// Pure halves of page sync: merging server rows into the local copy, choosing
// what to push, upgrading Markdown-notebook rows, and validating pushes on the
// server. Last write wins per page, by `updatedAt`.
import { isDocContent, PAGE_FONTS } from './page.ts';
import type { LegacyFolder, Page, PageRecord } from './page.ts';
import type { PagesById } from './tree.ts';

export const MAX_PAGE_CONTENT = 1_000_000;
export const MAX_PUSH_PAGES = 100;
export const MAX_PUSH_CHARS = 8_000_000;

/** Server rows that are newer than (or missing from) the local copy. */
export function newerRemotePages(local: PagesById, remote: Page[]): Page[] {
  return remote.filter((page) => {
    const mine = local[page.id];
    return !mine || page.updatedAt > mine.updatedAt;
  });
}

/** Local pages the server lacks or holds an older copy of. */
export function pagesToPush(local: PagesById, remote: Page[]): Page[] {
  const remoteUpdatedAt = new Map(remote.map((page) => [page.id, page.updatedAt]));
  return Object.values(local).filter((page) => {
    const theirs = remoteUpdatedAt.get(page.id);
    return theirs === undefined || page.updatedAt > theirs;
  });
}

/** Splits pages into requests that stay under the push limits. */
export function pushBatches(pages: Page[], maxPages = 50, maxChars = 3_000_000): Page[][] {
  const batches: Page[][] = [];
  let batch: Page[] = [];
  let chars = 0;
  for (const page of pages) {
    const size = page.content.length + page.title.length;
    if (batch.length && (batch.length >= maxPages || chars + size > maxChars)) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(page);
    chars += size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

export type UpgradeResult = {
  pages: Page[];
  /** Pages that changed shape and should be written back to the server. */
  upgraded: Page[];
};

/**
 * Turns rows from the Markdown notebook into pages: folders become parent
 * pages (same id), notes move under them, and Markdown bodies become editor
 * JSON through `toDoc`. Rows already in page form pass through unchanged.
 */
export function upgradeRecords(
  records: PageRecord[],
  folders: LegacyFolder[],
  toDoc: (markdown: string) => string
): UpgradeResult {
  const ids = new Set(records.map((record) => record.id));
  const upgraded: Page[] = [];
  const folderPages = new Set<string>();

  for (const folder of folders) {
    if (folder.deletedAt) continue;
    folderPages.add(folder.id);
    if (ids.has(folder.id)) continue;
    upgraded.push({
      id: folder.id,
      parentId: null,
      title: folder.name,
      icon: '📁',
      cover: null,
      coverY: 50,
      content: '',
      favorite: false,
      position: folder.createdAt,
      fullWidth: false,
      smallText: false,
      font: 'sans',
      locked: false,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      deletedAt: null,
      purged: false
    });
  }

  const pages = records.map((record): Page => {
    const { folderId, ...page } = record;
    const legacy = (folderId !== undefined && folderId !== null) || !isDocContent(page.content);
    if (!legacy) return page;
    const next: Page = {
      ...page,
      // Notebook rows all share position 0; order them by creation instead.
      position: page.position || page.createdAt,
      parentId: page.parentId ?? (folderId && (folderPages.has(folderId) || ids.has(folderId)) ? folderId : null),
      content: isDocContent(page.content) ? page.content : toDoc(page.content)
    };
    upgraded.push(next);
    return next;
  });

  return { pages: [...pages, ...upgraded.filter((page) => !ids.has(page.id))], upgraded };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 100;
const isOptionalText = (value: unknown, max: number) =>
  value === null || (typeof value === 'string' && value.length <= max);

function parsePage(item: unknown): Page {
  if (
    !isRecord(item) ||
    !isId(item.id) ||
    !(item.parentId === null || isId(item.parentId)) ||
    typeof item.title !== 'string' || item.title.length > 2000 ||
    !isOptionalText(item.icon, 200) ||
    !isOptionalText(item.cover, 2000) ||
    typeof item.coverY !== 'number' || !(item.coverY >= 0 && item.coverY <= 100) ||
    typeof item.content !== 'string' || item.content.length > MAX_PAGE_CONTENT ||
    typeof item.favorite !== 'boolean' ||
    typeof item.position !== 'number' || !Number.isFinite(item.position) ||
    typeof item.fullWidth !== 'boolean' ||
    typeof item.smallText !== 'boolean' ||
    !PAGE_FONTS.includes(item.font as Page['font']) ||
    typeof item.locked !== 'boolean' ||
    typeof item.purged !== 'boolean' ||
    !isTimestamp(item.createdAt) || !isTimestamp(item.updatedAt) ||
    !(item.deletedAt === null || isTimestamp(item.deletedAt))
  ) {
    throw new Error('Invalid page in sync request.');
  }
  return {
    id: item.id,
    parentId: item.parentId,
    title: item.title,
    icon: item.icon as string | null,
    cover: item.cover as string | null,
    coverY: item.coverY,
    content: item.content,
    favorite: item.favorite,
    position: item.position,
    fullWidth: item.fullWidth,
    smallText: item.smallText,
    font: item.font as Page['font'],
    locked: item.locked,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt,
    purged: item.purged
  };
}

/** Validates a push request at the server boundary. */
export function parsePushInput(value: unknown): { pages: Page[] } {
  if (!isRecord(value) || !Array.isArray(value.pages)) throw new Error('Invalid sync request.');
  if (value.pages.length > MAX_PUSH_PAGES) throw new Error('Too many pages in one sync request.');
  const pages = value.pages.map(parsePage);
  const chars = pages.reduce((total, page) => total + page.content.length + page.title.length, 0);
  if (chars > MAX_PUSH_CHARS) throw new Error('This sync request is too large.');
  return { pages };
}
