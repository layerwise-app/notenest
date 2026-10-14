import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  checklistStats,
  countTags,
  extractOutline,
  extractTags,
  extractWikiLinks,
  findBacklinks,
  findNoteByTitle,
  hasTag,
  noteSnippet,
  toggleTaskLine,
  wordCount
} from '../src/lib/note-text.ts';
import type { Note } from '../src/lib/notes.ts';

function note(partial: Partial<Note> & { id: string }): Note {
  return {
    title: '',
    content: '',
    folderId: null,
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
    deletedAt: null,
    ...partial
  };
}

describe('extractTags', () => {
  test('finds inline and nested tags, lower-cased and de-duplicated', () => {
    assert.deepEqual(
      extractTags('Reading #Books and #work/meetings.\nMore #books (#ideas)'),
      ['books', 'work/meetings', 'ideas']
    );
  });

  test('ignores headings, numbers, URLs, entities, and code', () => {
    const content = [
      '# Heading',
      '## Another',
      'Issue #42 and C#',
      'See https://example.com/#anchor and &#39;',
      '[link](#section)',
      'Inline `#notatag` here',
      '```',
      '#hidden',
      '```',
      'Real #tag-'
    ].join('\n');
    assert.deepEqual(extractTags(content), ['tag']);
  });

  test('hasTag matches nested children', () => {
    assert.equal(hasTag(['work/meetings'], 'work'), true);
    assert.equal(hasTag(['workshop'], 'work'), false);
  });

  test('countTags counts notes per tag, sorted by name', () => {
    assert.deepEqual(
      countTags([{ content: '#b #a' }, { content: '#a #a' }]),
      [{ tag: 'a', count: 2 }, { tag: 'b', count: 1 }]
    );
  });
});

describe('wiki links and backlinks', () => {
  test('extracts targets with optional labels', () => {
    assert.deepEqual(extractWikiLinks('See [[Project brief]] and [[Q4 plan|the plan]].'), [
      { target: 'Project brief', label: 'Project brief', line: 0 },
      { target: 'Q4 plan', label: 'the plan', line: 0 }
    ]);
  });

  test('resolves titles case- and whitespace-insensitively, skipping deleted notes', () => {
    const notes = [
      note({ id: 'old', title: 'Reading  List', updatedAt: 1 }),
      note({ id: 'new', title: 'reading list', updatedAt: 5 }),
      note({ id: 'gone', title: 'Reading list', updatedAt: 9, deletedAt: 9 })
    ];
    assert.equal(findNoteByTitle(notes, ' Reading list ')?.id, 'new');
    assert.equal(findNoteByTitle(notes, 'Missing'), null);
  });

  test('finds backlinks with the linking line as excerpt', () => {
    const target = note({ id: 't', title: 'Garden' });
    const notes = [
      target,
      note({ id: 'a', title: 'A', content: 'Intro\nPlant bulbs in the **[[garden]]** soon', updatedAt: 3 }),
      note({ id: 'b', title: 'B', content: 'Nothing here' }),
      note({ id: 'c', title: 'C', content: '[[Garden]]', deletedAt: 2 }),
      note({ id: 't2', title: 'Self', content: '`[[Garden]]`' })
    ];
    const backlinks = findBacklinks(notes, target);
    assert.deepEqual(backlinks.map((item) => item.note.id), ['a']);
    assert.equal(backlinks[0].excerpt, 'Plant bulbs in the garden soon');
  });
});

describe('checklists', () => {
  const content = '- [ ] one\n- [x] two\n* [X] three\n1. [ ] four\n```\n- [ ] code\n```\n- [] not a task';

  test('counts done and total tasks outside code', () => {
    assert.deepEqual(checklistStats(content), { done: 2, total: 4 });
  });

  test('toggles a task line in both directions', () => {
    const checked = toggleTaskLine(content, 0);
    assert.equal(checked.split('\n')[0], '- [x] one');
    assert.equal(toggleTaskLine(checked, 0).split('\n')[0], '- [ ] one');
    assert.equal(toggleTaskLine(content, 2).split('\n')[2], '* [ ] three');
    assert.equal(toggleTaskLine(content, 3).split('\n')[3], '1. [x] four');
  });

  test('leaves non-task and code lines untouched', () => {
    assert.equal(toggleTaskLine(content, 5), content);
    assert.equal(toggleTaskLine(content, 7), content);
    assert.equal(toggleTaskLine(content, 99), content);
  });
});

describe('outline, snippet, and counts', () => {
  test('extracts headings outside code', () => {
    assert.deepEqual(extractOutline('# Title\ntext\n```\n# no\n```\n### **Deep** dive'), [
      { level: 1, text: 'Title', line: 0 },
      { level: 3, text: 'Deep dive', line: 5 }
    ]);
  });

  test('snippet strips Markdown syntax and tags', () => {
    assert.equal(
      noteSnippet('## Plan\n- [x] Call **Ana** about [[Q4 plan|the plan]] #work\n> [docs](https://x.y)'),
      'Plan Call Ana about the plan docs'
    );
  });

  test('counts words, including CJK characters', () => {
    assert.equal(wordCount('# Hello world\n- [ ] it’s **done**'), 4);
    assert.equal(wordCount('笔记 app'), 3);
    assert.equal(wordCount(''), 0);
  });
});
