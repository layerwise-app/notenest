// Workspace operations that touch more than one field or page: creating,
// nesting, moving, duplicating, and the Trash lifecycle.
import { isLive, makePage } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { canNest, childrenIndex, descendantIds, lastPosition, positionBetween } from '~/lib/pages/tree';
import { openEditor } from '~/lib/workspace/editors';
import { getPage, getPages, insertPages, updatePage, updatePages } from '~/lib/workspace/store';

type NewPage = Partial<Omit<Page, 'id' | 'createdAt' | 'updatedAt'>> & {
  /** Add a page block for it at the end of the parent page (Notion's default). */
  linkInParent?: boolean;
};

export function createPage({ linkInParent = true, ...init }: NewPage = {}): Page {
  const parentId = init.parentId ?? null;
  const siblings = childrenIndex(getPages()).get(parentId ?? '') ?? [];
  const page = makePage({ position: lastPosition(siblings), ...init, parentId });
  insertPages([page]);
  if (parentId && linkInParent) appendPageBlock(parentId, page.id);
  return page;
}

/** Appends a block linking to `childId` at the end of page `pageId`. */
export function appendPageBlock(pageId: string, childId: string) {
  const block = { type: 'pageBlock', attrs: { pageId: childId } };
  const editor = openEditor(pageId);
  if (editor && !editor.isDestroyed) {
    const end = editor.state.doc.content.size;
    const last = editor.state.doc.lastChild;
    // Replace a trailing empty paragraph instead of leaving it above the block.
    const isEmptyTail = last?.type.name === 'paragraph' && last.content.size === 0;
    editor.commands.insertContentAt(isEmptyTail ? { from: end - last.nodeSize, to: end } : end, block);
    return;
  }
  const page = getPage(pageId);
  if (!page) return;
  const doc = page.content ? JSON.parse(page.content) : { type: 'doc', content: [] };
  doc.content = [...(doc.content ?? []), block];
  updatePage(pageId, { content: JSON.stringify(doc) });
}

export function toggleFavorite(id: string) {
  const page = getPage(id);
  if (page) updatePage(id, { favorite: !page.favorite });
}

/** Moves a page (and its subpages) to Trash. */
export function trashPage(id: string) {
  const pages = getPages();
  const now = Date.now();
  const ids = [id, ...descendantIds(pages, id).filter((childId) => pages[childId] && isLive(pages[childId]))];
  updatePages(ids.map((pageId) => ({ id: pageId, patch: { deletedAt: now } })));
}

/** Restores a page and the subpages that went to Trash with it. */
export function restorePage(id: string) {
  const pages = getPages();
  const page = pages[id];
  if (!page || page.purged) return;
  const deletedAt = page.deletedAt;
  const parent = page.parentId ? pages[page.parentId] : undefined;
  const patches: { id: string; patch: Partial<Page> }[] = [
    { id, patch: { deletedAt: null, ...(parent && isLive(parent) ? {} : { parentId: null }) } }
  ];
  for (const childId of descendantIds(pages, id)) {
    const child = pages[childId];
    if (child && !child.purged && child.deletedAt === deletedAt) patches.push({ id: childId, patch: { deletedAt: null } });
  }
  updatePages(patches);
}

const purgedPatch = (page: Page): Partial<Page> => ({
  purged: true,
  title: '',
  content: '',
  icon: null,
  cover: null,
  favorite: false,
  deletedAt: page.deletedAt ?? Date.now()
});

/** Deletes a page and its subpages for good. */
export function purgePage(id: string) {
  const pages = getPages();
  const ids = [id, ...descendantIds(pages, id)];
  updatePages(ids.flatMap((pageId) => (pages[pageId] && !pages[pageId].purged ? [{ id: pageId, patch: purgedPatch(pages[pageId]) }] : [])));
}

export function emptyTrash() {
  const pages = Object.values(getPages()).filter((page) => page.deletedAt !== null && !page.purged);
  updatePages(pages.map((page) => ({ id: page.id, patch: purgedPatch(page) })));
}

/** Nests `id` under `parentId`, placed before `beforeId` (or last). */
export function movePage(id: string, parentId: string | null, beforeId: string | null = null) {
  const pages = getPages();
  if (!pages[id] || !canNest(pages, id, parentId)) return false;
  const siblings = (childrenIndex(pages).get(parentId ?? '') ?? []).filter((page) => page.id !== id);
  const index = beforeId ? siblings.findIndex((page) => page.id === beforeId) : -1;
  const position =
    index === -1
      ? lastPosition(siblings)
      : positionBetween(siblings[index - 1]?.position, siblings[index].position);
  updatePage(id, { parentId, position });
  return true;
}

/** Copies a page and its subpages; the copy lands right after the original. */
export function duplicatePage(id: string): Page | null {
  const pages = getPages();
  const source = pages[id];
  if (!source || !isLive(source)) return null;
  const ids = [id, ...descendantIds(pages, id).filter((childId) => pages[childId] && isLive(pages[childId]))];
  const newIds = new Map(ids.map((pageId) => [pageId, crypto.randomUUID()]));
  const remap = (content: string) =>
    content.replace(/"pageId":"([^"]+)"/g, (match, pageId: string) => {
      const next = newIds.get(pageId);
      return next ? `"pageId":"${next}"` : match;
    });

  const siblings = childrenIndex(pages).get(source.parentId ?? '') ?? [];
  const index = siblings.findIndex((page) => page.id === id);
  const now = Date.now();
  const copies = ids.map((pageId): Page => {
    const page = pages[pageId];
    return {
      ...page,
      id: newIds.get(pageId)!,
      parentId: pageId === id ? page.parentId : (newIds.get(page.parentId ?? '') ?? page.parentId),
      position: pageId === id ? positionBetween(source.position, siblings[index + 1]?.position) : page.position,
      content: remap(page.content),
      favorite: false,
      createdAt: now,
      updatedAt: now
    };
  });
  insertPages(copies);
  return copies[0];
}
