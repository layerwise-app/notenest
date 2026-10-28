import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, useEditorState } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';

type Heading = { level: number; text: string; pos: number };

/** Notion's "Table of contents" block: links to the page's headings. */
export const TableOfContents = Node.create({
  name: 'tableOfContents',
  group: 'block',
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'nav[data-type="table-of-contents"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['nav', mergeAttributes(HTMLAttributes, { 'data-type': 'table-of-contents' })];
  },

  renderMarkdown() {
    return '';
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableOfContentsView);
  }
});

function TableOfContentsView({ editor, selected }: NodeViewProps) {
  const headings = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const list: Heading[] = [];
      current.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') list.push({ level: Number(node.attrs.level), text: node.textContent, pos });
        return node.type.name !== 'heading';
      });
      return list;
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b)
  });

  function jump(heading: Heading) {
    const dom = editor.view.nodeDOM(heading.pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const { tr, doc } = editor.state;
    editor.view.dispatch(tr.setSelection(TextSelection.create(doc, heading.pos + 1 + heading.text.length)));
    editor.view.focus();
  }

  const minLevel = Math.min(...headings.map((heading) => heading.level));
  return (
    <NodeViewWrapper className='notion-toc' data-selected={selected || undefined}>
      {headings.length ? (
        headings.map((heading) => (
          <button
            key={heading.pos}
            type='button'
            onClick={() => jump(heading)}
            className='notion-toc-item'
            style={{ paddingLeft: 2 + (heading.level - minLevel) * 24 }}
          >
            {heading.text || 'Untitled'}
          </button>
        ))
      ) : (
        <p className='notion-toc-empty'>Add headings to create a table of contents.</p>
      )}
    </NodeViewWrapper>
  );
}
