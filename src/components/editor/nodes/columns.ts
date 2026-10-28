// Side-by-side columns (Notion's "2 columns", "3 columns"…).
import { mergeAttributes, Node } from '@tiptap/core';

export const ColumnList = Node.create({
  name: 'columnList',
  group: 'block',
  content: 'column{2,5}',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column-list"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column-list', class: 'notion-columns' }), 0];
  },
  renderMarkdown(node, helpers) {
    return helpers.renderChildren(node.content ?? [], '\n\n');
  }
});

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'notion-column' }), 0];
  },
  renderMarkdown(node, helpers) {
    return helpers.renderChildren(node.content ?? [], '\n\n');
  }
});

/** JSON for a row of `count` empty columns. */
export function columnsJSON(count: number) {
  return {
    type: 'columnList',
    content: Array.from({ length: count }, () => ({ type: 'column', content: [{ type: 'paragraph' }] }))
  };
}
