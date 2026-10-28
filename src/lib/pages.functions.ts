import { and, eq, inArray, sql } from 'drizzle-orm';
import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { db } from '~/db';
import { syncedFolder, syncedNote } from '~/db/schema';
import { auth } from '~/lib/auth';
import { PAGE_FONTS } from '~/lib/pages/page';
import type { LegacyFolder, PageFont, PageRecord } from '~/lib/pages/page';
import { parsePushInput } from '~/lib/pages/sync';

// D1 binds at most 100 parameters per statement.
const ID_CHUNK = 90;
const ROWS_PER_INSERT = 5;

const requireUserId = async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error('Sign in to sync your pages.');
  return session.user.id;
};

type NoteRow = typeof syncedNote.$inferSelect;

function toRecord({ userId: _userId, pinned, font, ...row }: NoteRow): PageRecord {
  return {
    ...row,
    favorite: pinned,
    font: PAGE_FONTS.includes(font as PageFont) ? (font as PageFont) : 'sans'
  };
}

/** Every page the signed-in user has, plus folders left from the Markdown notebook. */
export const pullPages = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ pages: PageRecord[]; folders: LegacyFolder[] }> => {
    const userId = await requireUserId();
    const [pages, folders] = await Promise.all([
      db.select().from(syncedNote).where(eq(syncedNote.userId, userId)),
      db.select().from(syncedFolder).where(eq(syncedFolder.userId, userId))
    ]);
    return {
      pages: pages.map(toRecord),
      folders: folders.map(({ userId: _userId, ...folder }) => folder)
    };
  }
);

/**
 * Saves pages, keeping whichever copy was edited last. Returns the server's
 * copy of any page it already held a newer version of.
 */
export const pushPages = createServerFn({ method: 'POST' })
  .validator(parsePushInput)
  .handler(async ({ data }): Promise<{ newer: PageRecord[] }> => {
    const userId = await requireUserId();
    const ids = data.pages.map((page) => page.id);
    const existing = new Map<string, number>();
    for (let index = 0; index < ids.length; index += ID_CHUNK) {
      const rows = await db
        .select({ id: syncedNote.id, updatedAt: syncedNote.updatedAt })
        .from(syncedNote)
        .where(and(eq(syncedNote.userId, userId), inArray(syncedNote.id, ids.slice(index, index + ID_CHUNK))));
      for (const row of rows) existing.set(row.id, row.updatedAt);
    }

    const accepted = data.pages.filter((page) => (existing.get(page.id) ?? -1) <= page.updatedAt);
    const rejected = data.pages.filter((page) => (existing.get(page.id) ?? -1) > page.updatedAt).map((page) => page.id);
    const rows = accepted.map(({ favorite, ...page }) => ({
      ...page,
      userId,
      pinned: favorite,
      // Saving in page form ends the Markdown-notebook folder link.
      folderId: null
    }));

    const statements = [];
    for (let index = 0; index < rows.length; index += ROWS_PER_INSERT) {
      statements.push(
        db.insert(syncedNote).values(rows.slice(index, index + ROWS_PER_INSERT)).onConflictDoUpdate({
          target: [syncedNote.userId, syncedNote.id],
          set: {
            title: sql.raw('excluded."title"'),
            content: sql.raw('excluded."content"'),
            folderId: sql.raw('excluded."folder_id"'),
            pinned: sql.raw('excluded."pinned"'),
            parentId: sql.raw('excluded."parent_id"'),
            icon: sql.raw('excluded."icon"'),
            cover: sql.raw('excluded."cover"'),
            coverY: sql.raw('excluded."cover_y"'),
            position: sql.raw('excluded."position"'),
            fullWidth: sql.raw('excluded."full_width"'),
            smallText: sql.raw('excluded."small_text"'),
            font: sql.raw('excluded."font"'),
            locked: sql.raw('excluded."locked"'),
            purged: sql.raw('excluded."purged"'),
            createdAt: sql.raw('excluded."created_at"'),
            updatedAt: sql.raw('excluded."updated_at"'),
            deletedAt: sql.raw('excluded."deleted_at"')
          },
          // Another device may have written a newer copy since the check above.
          setWhere: sql`${syncedNote.updatedAt} <= excluded."updated_at"`
        })
      );
    }
    if (statements.length) {
      const [first, ...rest] = statements;
      await db.batch([first, ...rest]);
    }

    const newer: PageRecord[] = [];
    for (let index = 0; index < rejected.length; index += ID_CHUNK) {
      const rows = await db
        .select()
        .from(syncedNote)
        .where(and(eq(syncedNote.userId, userId), inArray(syncedNote.id, rejected.slice(index, index + ID_CHUNK))));
      newer.push(...rows.map(toRecord));
    }
    return { newer };
  });
