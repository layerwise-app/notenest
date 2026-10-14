import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseInline, parseMarkdown, safeUrl } from '../src/lib/markdown.ts';
import type { Inline } from '../src/lib/markdown.ts';

describe('safeUrl', () => {
  test('allows web, mail, and phone links', () => {
    assert.equal(safeUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
    assert.equal(safeUrl('mailto:hi@example.com'), 'mailto:hi@example.com');
    assert.equal(safeUrl('www.example.com'), 'https://www.example.com');
  });

  test('blocks script-capable and obfuscated schemes', () => {
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      'java\nscript:alert(1)',
      ' \tjavascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox',
      'relative/path'
    ]) {
      assert.equal(safeUrl(href), null, href);
    }
  });
});

describe('parseInline', () => {
  test('keeps raw HTML as plain text', () => {
    assert.deepEqual(parseInline('<img src=x onerror=alert(1)>'), [
      { type: 'text', text: '<img src=x onerror=alert(1)>' }
    ]);
  });

  test('drops unsafe link targets but keeps the label', () => {
    const nodes: Inline[] = parseInline('[click](javascript:alert(1)) [ok](data:text/html,x)');
    assert.equal(nodes.some((node) => node.type === 'link'), false);
    assert.deepEqual(nodes, [{ type: 'text', text: 'click) ok' }]);
  });

  test('parses emphasis, code, links, wiki links, and tags', () => {
    assert.deepEqual(
      parseInline('**Bold** and *it* `#code` [site](https://a.b) [[Note|alias]] #Tag/sub ==hi== ~~old~~'),
      [
        { type: 'strong', children: [{ type: 'text', text: 'Bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'em', children: [{ type: 'text', text: 'it' }] },
        { type: 'text', text: ' ' },
        { type: 'code', text: '#code' },
        { type: 'text', text: ' ' },
        { type: 'link', href: 'https://a.b', children: [{ type: 'text', text: 'site' }] },
        { type: 'text', text: ' ' },
        { type: 'wikilink', target: 'Note', label: 'alias' },
        { type: 'text', text: ' ' },
        { type: 'tag', tag: 'tag/sub', text: '#Tag/sub' },
        { type: 'text', text: ' ' },
        { type: 'mark', children: [{ type: 'text', text: 'hi' }] },
        { type: 'text', text: ' ' },
        { type: 'del', children: [{ type: 'text', text: 'old' }] }
      ]
    );
  });

  test('does not treat snake_case or URLs fragments as markup', () => {
    assert.deepEqual(parseInline('snake_case_name'), [{ type: 'text', text: 'snake_case_name' }]);
    const nodes = parseInline('see https://x.io/#top.');
    assert.equal(nodes[1].type, 'link');
    assert.deepEqual(nodes[2], { type: 'text', text: '.' });
  });
});

describe('parseMarkdown', () => {
  test('builds blocks with source line numbers', () => {
    const blocks = parseMarkdown(
      ['# Title', '', 'Para line one', 'line two', '- [ ] task', '  - [x] nested', '1. first', '> quote', '---', '```ts', 'const a = "<b>";', '```'].join('\n')
    );
    assert.deepEqual(blocks.map((block) => [block.type, block.line]), [
      ['heading', 0],
      ['paragraph', 2],
      ['list', 4],
      ['list', 6],
      ['quote', 7],
      ['hr', 8],
      ['code', 9]
    ]);
    const tasks = blocks[2];
    assert.equal(tasks.type, 'list');
    if (tasks.type === 'list') {
      assert.deepEqual(tasks.items.map((item) => [item.line, item.depth, item.task]), [[4, 0, false], [5, 1, true]]);
    }
    const code = blocks[6];
    assert.equal(code.type === 'code' && code.text, 'const a = "<b>";');
  });

  test('parses simple tables', () => {
    const [table] = parseMarkdown('| A | B |\n|:--|--:|\n| 1 | 2 |');
    assert.equal(table.type, 'table');
    if (table.type === 'table') {
      assert.deepEqual(table.align, ['left', 'right']);
      assert.equal(table.rows.length, 1);
    }
  });
});
