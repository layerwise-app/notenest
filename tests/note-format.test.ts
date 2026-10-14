import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { highlightInline, highlightMarkdown } from '../src/lib/markdown-highlight.ts';
import { formatEdited, formatListDate, markdownFileName, noteToMarkdown } from '../src/lib/note-format.ts';

const now = new Date(2026, 9, 14, 15, 0);
const at = (...args: [number, number, number, number?, number?]) => new Date(...args).getTime();

describe('formatListDate', () => {
  test('uses time, yesterday, weekday, then date', () => {
    assert.match(formatListDate(at(2026, 9, 14, 9, 41), now), /^9:41\sAM$/);
    assert.equal(formatListDate(at(2026, 9, 13, 23, 0), now), 'Yesterday');
    assert.equal(formatListDate(at(2026, 9, 10, 12, 0), now), 'Saturday');
    assert.equal(formatListDate(at(2026, 8, 30, 12, 0), now), 'Sep 30');
    assert.equal(formatListDate(at(2025, 11, 31, 12, 0), now), 'Dec 31, 2025');
  });

  test('formatEdited reads naturally', () => {
    assert.equal(formatEdited(now.getTime() - 5_000, now), 'Edited just now');
    assert.equal(formatEdited(at(2026, 9, 13, 8, 0), now), 'Edited yesterday');
  });
});

describe('export helpers', () => {
  test('noteToMarkdown puts the title first as an H1', () => {
    assert.equal(noteToMarkdown({ title: ' Plan ', content: 'Body\n\n' }), '# Plan\n\nBody\n');
    assert.equal(noteToMarkdown({ title: 'Plan', content: '' }), '# Plan\n');
    assert.equal(noteToMarkdown({ title: '', content: 'Only body' }), 'Only body\n');
  });

  test('markdownFileName strips unsafe characters', () => {
    assert.equal(markdownFileName({ title: 'Q4: plans / risks?' }), 'Q4 plans risks.md');
    assert.equal(markdownFileName({ title: '   ' }), 'Untitled.md');
    assert.equal(markdownFileName({ title: 'x'.repeat(120) }).length, 83);
  });
});

describe('markdown highlight', () => {
  const kinds = (text: string) => highlightInline(text).map((token) => `${token.kind}:${token.text}`);

  test('splits inline syntax without changing the text', () => {
    const text = 'Ship **sync** with `code`, ==20%== and [[Launch]] #work at https://example.com';
    assert.equal(
      highlightInline(text)
        .map((token) => token.text)
        .join(''),
      text
    );
    assert.deepEqual(kinds('a **b** c'), ['text:a ', 'marker:**', 'strong:b', 'marker:**', 'text: c']);
    assert.deepEqual(kinds('[doc](https://x.io)'), ['marker:[', 'link:doc', 'url:](https://x.io)']);
    assert.deepEqual(kinds('see #ideas'), ['text:see ', 'tag:#ideas']);
    assert.deepEqual(kinds('snake_case_name'), ['text:snake_case_name']);
  });

  test('classifies block lines and keeps code blocks literal', () => {
    const lines = highlightMarkdown('## Goals\n- [x] Done #a\n- [ ] Open\n> Quote\n```\n#not-a-tag\n```\n---');
    assert.deepEqual(
      lines.map((line) => line.kind),
      ['heading', 'done', 'plain', 'quote', 'code', 'code', 'code', 'rule']
    );
    assert.deepEqual(lines[1].tokens[0], { kind: 'marker', text: '- [x]' });
    assert.deepEqual(lines[5].tokens, [{ kind: 'text', text: '#not-a-tag' }]);
  });
});
