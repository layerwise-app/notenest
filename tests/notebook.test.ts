import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { groupNotes, notesInView, searchNotes, sortNotes } from '../src/lib/notebook.ts';
import { dailyNoteTitle, NOTE_TEMPLATES } from '../src/lib/note-templates.ts';
import { checklistStats, extractTags } from '../src/lib/note-text.ts';
import type { Note } from '../src/lib/notes.ts';

const day = 86_400_000;
const now = new Date(2026, 9, 14, 15, 0);

function note(partial: Partial<Note> & { id: string }): Note {
  return {
    title: partial.id,
    content: '',
    folderId: null,
    pinned: false,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    deletedAt: null,
    ...partial
  };
}

const notes = [
  note({ id: 'a', content: '#work/q4 plan', folderId: 'f1', updatedAt: now.getTime() - 1000 }),
  note({ id: 'b', content: 'groceries', pinned: true, updatedAt: now.getTime() - 3 * day }),
  note({ id: 'c', content: '#work', updatedAt: now.getTime() - 40 * day }),
  note({ id: 'd', content: 'gone', deletedAt: now.getTime() })
];

describe('notebook views', () => {
  test('filters by view', () => {
    assert.deepEqual(notesInView(notes, 'all').map((n) => n.id), ['a', 'b', 'c']);
    assert.deepEqual(notesInView(notes, 'pinned').map((n) => n.id), ['b']);
    assert.deepEqual(notesInView(notes, 'trash').map((n) => n.id), ['d']);
    assert.deepEqual(notesInView(notes, 'folder:f1').map((n) => n.id), ['a']);
    assert.deepEqual(notesInView(notes, 'tag:work').map((n) => n.id), ['a', 'c']);
    assert.deepEqual(notesInView(notes, 'tag:work/q4').map((n) => n.id), ['a']);
  });

  test('search requires every term and checks folder names', () => {
    const folders = [{ id: 'f1', name: 'Planning', createdAt: 0, updatedAt: 0, deletedAt: null }];
    assert.deepEqual(searchNotes(notes, 'plan WORK', folders).map((n) => n.id), ['a']);
    assert.deepEqual(searchNotes(notes, 'planning', folders).map((n) => n.id), ['a']);
  });

  test('sorts pinned first and groups by date', () => {
    const sorted = sortNotes(notesInView(notes, 'all'), 'edited');
    assert.deepEqual(sorted.map((n) => n.id), ['b', 'a', 'c']);
    assert.deepEqual(
      groupNotes(sorted, 'edited', true, now).map((group) => [group.label, group.notes.map((n) => n.id)]),
      [['Pinned', ['b']], ['Today', ['a']], ['September', ['c']]]
    );
    assert.deepEqual(
      groupNotes(sortNotes(notes, 'title', false), 'title', false, now).map((group) => group.label),
      ['']
    );
  });
});

describe('templates', () => {
  test('daily journal uses the daily note title and a tag', () => {
    const journal = NOTE_TEMPLATES.find((item) => item.id === 'journal')!.build(now);
    assert.equal(journal.title, dailyNoteTitle(now));
    assert.equal(journal.title, 'October 14, 2026');
    assert.deepEqual(extractTags(journal.content), ['journal']);
  });

  test('every template has a checklist and a tag', () => {
    for (const template of NOTE_TEMPLATES) {
      const { content } = template.build(now);
      assert.ok(checklistStats(content).total > 0, template.id);
      assert.equal(extractTags(content).length, 1, template.id);
    }
  });
});
