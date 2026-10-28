import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { makePage } from '../src/lib/pages/page.ts';
import type { Page, PageRecord } from '../src/lib/pages/page.ts';
import {
  newerRemotePages,
  pagesToPush,
  parsePushInput,
  pushBatches,
  upgradeRecords
} from '../src/lib/pages/sync.ts';
import { ancestors, canNest, childrenIndex, descendantIds, positionBetween } from '../src/lib/pages/tree.ts';
import type { PagesById } from '../src/lib/pages/tree.ts';

const page = (id: string, init: Partial<Page> = {}) => makePage({ id, createdAt: 1, updatedAt: 1, position: 1, ...init });
const byId = (...pages: Page[]): PagesById => Object.fromEntries(pages.map((item) => [item.id, item]));

describe('page tree', () => {
  test('groups live pages under their parent, ordered by position', () => {
    const pages = byId(
      page('a', { position: 2 }),
      page('b', { position: 1 }),
      page('c', { parentId: 'a', position: 5 }),
      page('d', { parentId: 'a', position: 3 }),
      page('gone', { deletedAt: 10 })
    );
    const index = childrenIndex(pages);
    assert.deepEqual(index.get('')?.map((item) => item.id), ['b', 'a']);
    assert.deepEqual(index.get('a')?.map((item) => item.id), ['d', 'c']);
  });

  test('shows pages whose parent is missing or in Trash at the top level', () => {
    const pages = byId(page('p', { deletedAt: 5 }), page('child', { parentId: 'p' }), page('orphan', { parentId: 'nope' }));
    assert.deepEqual(childrenIndex(pages).get('')?.map((item) => item.id).sort(), ['child', 'orphan']);
  });

  test('walks ancestors and descendants, surviving cycles', () => {
    const pages = byId(page('a'), page('b', { parentId: 'a' }), page('c', { parentId: 'b' }), page('x', { parentId: 'y' }), page('y', { parentId: 'x' }));
    assert.deepEqual(ancestors(pages, 'c').map((item) => item.id), ['a', 'b']);
    assert.deepEqual(descendantIds(pages, 'a').sort(), ['b', 'c']);
    assert.deepEqual(ancestors(pages, 'x').map((item) => item.id), ['y']);
  });

  test('refuses to nest a page inside itself or its subpages', () => {
    const pages = byId(page('a'), page('b', { parentId: 'a' }), page('c'));
    assert.equal(canNest(pages, 'a', 'b'), false);
    assert.equal(canNest(pages, 'a', 'a'), false);
    assert.equal(canNest(pages, 'b', 'c'), true);
    assert.equal(canNest(pages, 'b', null), true);
  });

  test('positions sort between neighbors', () => {
    assert.equal(positionBetween(1, 3), 2);
    assert.equal(positionBetween(undefined, 3), 2);
    assert.equal(positionBetween(4, undefined), 5);
  });
});

describe('page sync', () => {
  test('takes newer server copies and pushes newer local ones', () => {
    const local = byId(page('a', { updatedAt: 5 }), page('b', { updatedAt: 9 }), page('local-only'));
    const remote = [page('a', { updatedAt: 7 }), page('b', { updatedAt: 3 }), page('remote-only')];
    assert.deepEqual(newerRemotePages(local, remote).map((item) => item.id), ['a', 'remote-only']);
    assert.deepEqual(pagesToPush(local, remote).map((item) => item.id), ['b', 'local-only']);
  });

  test('splits pushes by count and size', () => {
    const big = 'x'.repeat(600);
    const pages = Array.from({ length: 5 }, (_, index) => page(`p${index}`, { content: big }));
    assert.deepEqual(pushBatches(pages, 2, 10_000).map((batch) => batch.length), [2, 2, 1]);
    assert.deepEqual(pushBatches(pages, 50, 1000).map((batch) => batch.length), [1, 1, 1, 1, 1]);
  });

  test('turns notebook folders into parent pages and Markdown into documents', () => {
    const note: PageRecord = { ...page('n1', { createdAt: 50, position: 0 }), title: 'Note', content: '# Hi', folderId: 'f1' };
    const loose: PageRecord = { ...page('n2', { position: 0 }), content: 'plain', folderId: 'missing' };
    const current: PageRecord = { ...page('n3'), content: '{"type":"doc","content":[]}', folderId: null };
    const { pages, upgraded } = upgradeRecords(
      [note, loose, current],
      [
        { id: 'f1', name: 'Work', createdAt: 2, updatedAt: 3, deletedAt: null },
        { id: 'f2', name: 'Old', createdAt: 2, updatedAt: 3, deletedAt: 4 }
      ],
      (markdown) => JSON.stringify({ type: 'doc', md: markdown })
    );
    const get = (id: string) => pages.find((item) => item.id === id)!;
    assert.equal(get('f1').title, 'Work');
    assert.equal(get('f1').icon, '📁');
    assert.equal(get('n1').parentId, 'f1');
    assert.equal(get('n1').position, 50);
    assert.equal(get('n1').content, '{"type":"doc","md":"# Hi"}');
    assert.equal(get('n2').parentId, null);
    const { folderId: _folderId, ...currentPage } = current;
    assert.deepEqual(get('n3'), currentPage);
    assert.equal(pages.some((item) => item.id === 'f2'), false);
    assert.deepEqual(upgraded.map((item) => item.id).sort(), ['f1', 'n1', 'n2']);
    assert.equal('folderId' in get('n1'), false);
  });

  test('validates pushes at the server boundary', () => {
    const valid = page('ok', { content: '{"type":"doc"}' });
    assert.equal(parsePushInput({ pages: [valid] }).pages[0].id, 'ok');
    assert.throws(() => parsePushInput({ pages: [{ ...valid, font: 'comic' }] }));
    assert.throws(() => parsePushInput({ pages: [{ ...valid, coverY: 120 }] }));
    assert.throws(() => parsePushInput({ pages: [{ ...valid, id: '' }] }));
    assert.throws(() => parsePushInput({ pages: Array.from({ length: 101 }, (_, index) => page(`p${index}`)) }));
    // Extra fields are dropped, not stored.
    const parsed = parsePushInput({ pages: [{ ...valid, userId: 'someone-else' }] }).pages[0] as Record<string, unknown>;
    assert.equal(parsed.userId, undefined);
  });
});
