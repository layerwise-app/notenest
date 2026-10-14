import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  continueList,
  indentListLines,
  insertCodeBlock,
  insertLink,
  insertWikiLink,
  toggleInline,
  toggleLinePrefix
} from '../src/lib/markdown-format.ts';
import type { EditorState } from '../src/lib/markdown-format.ts';

/** Builds state from text where `|` marks the caret or `[...]` marks the selection. */
function at(marked: string): EditorState {
  if (marked.includes('|')) {
    const start = marked.indexOf('|');
    return { text: marked.replace('|', ''), start, end: start };
  }
  const start = marked.indexOf('«');
  const end = marked.indexOf('»') - 1;
  return { text: marked.replace('«', '').replace('»', ''), start, end };
}

function show(state: EditorState) {
  const { text, start, end } = state;
  return start === end
    ? `${text.slice(0, start)}|${text.slice(start)}`
    : `${text.slice(0, start)}«${text.slice(start, end)}»${text.slice(end)}`;
}

describe('toggleInline', () => {
  test('wraps and unwraps a selection', () => {
    const bold = toggleInline(at('a «word» b'), 'bold');
    assert.equal(show(bold), 'a **«word»** b');
    assert.equal(show(toggleInline(bold, 'bold')), 'a «word» b');
  });

  test('unwraps when markers are selected too', () => {
    assert.equal(show(toggleInline(at('«~~gone~~»'), 'strike')), '«gone»');
  });

  test('italic inside bold adds a marker instead of removing bold', () => {
    const state = toggleInline(at('**«word»**'), 'italic');
    assert.equal(show(state), '***«word»***');
    assert.equal(show(toggleInline(state, 'italic')), '**«word»**');
  });

  test('empty selection inserts markers around the caret', () => {
    assert.equal(show(toggleInline(at('x |'), 'code')), 'x `|`');
  });
});

describe('toggleLinePrefix', () => {
  test('adds and removes a heading, keeping the caret on its text', () => {
    const heading = toggleLinePrefix(at('Hel|lo'), 'h2');
    assert.equal(show(heading), '## Hel|lo');
    assert.equal(show(toggleLinePrefix(heading, 'h2')), 'Hel|lo');
  });

  test('replaces other prefixes instead of stacking', () => {
    assert.equal(show(toggleLinePrefix(at('- item|'), 'task')), '- [ ] item|');
    assert.equal(show(toggleLinePrefix(at('# Big|'), 'h3')), '### Big|');
  });

  test('numbers every selected line and skips blank ones', () => {
    const state = toggleLinePrefix(at('«one\n\ntwo»'), 'numbered');
    assert.equal(state.text, '1. one\n\n2. two');
    assert.equal(toggleLinePrefix(state, 'numbered').text, 'one\n\ntwo');
  });

  test('quote on an empty line', () => {
    assert.equal(show(toggleLinePrefix(at('|'), 'quote')), '> |');
  });
});

describe('links and code', () => {
  test('insertLink selects the URL placeholder', () => {
    assert.equal(show(insertLink(at('«docs»'))), '[docs](«https://»)');
    assert.equal(show(insertLink(at('«https://a.io»'))), '[|](https://a.io)');
  });

  test('insertWikiLink replaces a typed [[ and closing ]]', () => {
    assert.equal(show(insertWikiLink(at('See [[|]]'), 'Plan')), 'See [[Plan]]|');
    assert.equal(show(insertWikiLink(at('See «x»'), 'Plan')), 'See [[Plan]]|');
  });

  test('insertCodeBlock fences multi-line selections', () => {
    assert.equal(insertCodeBlock(at('a\n«b\nc»')).text, 'a\n```\nb\nc\n```\n');
    assert.equal(show(insertCodeBlock(at('«x»'))), '`«x»`');
  });
});

describe('continueList', () => {
  test('continues bullets, tasks, numbers, and quotes', () => {
    assert.equal(show(continueList(at('- one|'))!), '- one\n- |');
    assert.equal(show(continueList(at('- [x] done|'))!), '- [x] done\n- [ ] |');
    assert.equal(show(continueList(at('  9. nine|'))!), '  9. nine\n  10. |');
    assert.equal(show(continueList(at('> said|'))!), '> said\n> |');
  });

  test('ends the list on an empty item', () => {
    assert.equal(show(continueList(at('- one\n- |'))!), '- one\n|');
  });

  test('ignores plain lines and carets inside the marker', () => {
    assert.equal(continueList(at('plain|')), null);
    assert.equal(continueList(at('-| item')), null);
  });
});

describe('indentListLines', () => {
  test('indents and outdents list lines', () => {
    const indented = indentListLines(at('- a|'), false)!;
    assert.equal(show(indented), '  - a|');
    assert.equal(show(indentListLines(indented, true)!), '- a|');
  });

  test('returns null outside lists', () => {
    assert.equal(indentListLines(at('text|'), false), null);
  });
});
