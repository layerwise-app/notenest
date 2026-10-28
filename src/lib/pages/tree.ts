// Pure queries over the page tree: children, ancestors, descendants, and
// sibling positions for ordering.
import { isLive } from './page.ts';
import type { Page } from './page.ts';

export type PagesById = Record<string, Page>;

const byPosition = (a: Page, b: Page) => a.position - b.position || a.createdAt - b.createdAt;

/**
 * Live pages grouped by parent id (`''` holds top-level pages), each list
 * sorted by position. A page whose parent is missing or deleted shows at the
 * top level so it never disappears.
 */
export function childrenIndex(pages: PagesById): Map<string, Page[]> {
  const index = new Map<string, Page[]>();
  for (const page of Object.values(pages)) {
    if (!isLive(page)) continue;
    const parent = page.parentId ? pages[page.parentId] : undefined;
    const key = parent && isLive(parent) ? parent.id : '';
    const siblings = index.get(key);
    if (siblings) siblings.push(page);
    else index.set(key, [page]);
  }
  for (const siblings of index.values()) siblings.sort(byPosition);
  return index;
}

/** The chain of parents from the top level down to (not including) `id`. */
export function ancestors(pages: PagesById, id: string): Page[] {
  const chain: Page[] = [];
  const seen = new Set([id]);
  let parentId = pages[id]?.parentId ?? null;
  while (parentId && !seen.has(parentId)) {
    const parent = pages[parentId];
    if (!parent) break;
    seen.add(parentId);
    chain.unshift(parent);
    parentId = parent.parentId;
  }
  return chain;
}

/** Ids of every page nested under `id`, at any depth, deleted or not. */
export function descendantIds(pages: PagesById, id: string): string[] {
  const byParent = new Map<string, string[]>();
  for (const page of Object.values(pages)) {
    if (!page.parentId) continue;
    const list = byParent.get(page.parentId);
    if (list) list.push(page.id);
    else byParent.set(page.parentId, [page.id]);
  }
  const result: string[] = [];
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    for (const child of byParent.get(queue.shift()!) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      result.push(child);
      queue.push(child);
    }
  }
  return result;
}

/** True when `id` may move under `parentId` (not itself or its own subpage). */
export function canNest(pages: PagesById, id: string, parentId: string | null) {
  if (parentId === null) return true;
  if (parentId === id) return false;
  return !ancestors(pages, parentId).some((page) => page.id === id);
}

/** A position that sorts between two siblings; either side may be missing. */
export function positionBetween(before: number | undefined, after: number | undefined) {
  if (before === undefined && after === undefined) return Date.now();
  if (before === undefined) return after! - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}

/** The position after every page in `siblings`. */
export function lastPosition(siblings: Page[]) {
  return positionBetween(siblings.length ? Math.max(...siblings.map((page) => page.position)) : undefined, undefined);
}
