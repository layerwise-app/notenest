// The page model shared by the browser and the sync server functions. Keep
// this file free of browser and Worker APIs: tests import it directly.

export const PAGE_FONTS = ['sans', 'serif', 'mono'] as const;
export type PageFont = (typeof PAGE_FONTS)[number];

export type Page = {
  id: string;
  /** The page this one is nested in; null for a top-level page. */
  parentId: string | null;
  title: string;
  /** An emoji, or null. */
  icon: string | null;
  /** `gradient:<n>`, `color:<name>`, or an image URL; null for none. */
  cover: string | null;
  /** Vertical focus of the cover image, 0–100. */
  coverY: number;
  /** Tiptap document JSON, or '' for an empty page. */
  content: string;
  favorite: boolean;
  /** Sort order among siblings, ascending. */
  position: number;
  fullWidth: boolean;
  smallText: boolean;
  font: PageFont;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
  /** Set while the page is in Trash. */
  deletedAt: number | null;
  /** Deleted from Trash for good; kept as an empty tombstone for sync. */
  purged: boolean;
};

/** A page as the server stores it. Rows from the Markdown notebook carry `folderId`. */
export type PageRecord = Page & { folderId?: string | null };

/** A folder from the Markdown notebook; it becomes a page when loaded. */
export type LegacyFolder = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export function makePage(init: Partial<Page> = {}): Page {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    parentId: null,
    title: '',
    icon: null,
    cover: null,
    coverY: 50,
    content: '',
    favorite: false,
    position: now,
    fullWidth: false,
    smallText: false,
    font: 'sans',
    locked: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    purged: false,
    ...init
  };
}

/** Not in Trash and not deleted for good. */
export const isLive = (page: Page) => page.deletedAt === null && !page.purged;

export const pageTitle = (page: Pick<Page, 'title'> | undefined | null) =>
  page?.title.trim() || 'Untitled';

/** The editor JSON every page body starts with. */
export const isDocContent = (content: string) =>
  content === '' || content.startsWith('{"type":"doc"');
