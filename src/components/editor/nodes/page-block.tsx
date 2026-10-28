import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { ArrowUpRight, FileText } from 'lucide-react';
import { isLive, pageTitle } from '~/lib/pages/page';
import { useWorkspace } from '~/lib/workspace/store';
import { useEditorEnv } from '../editor-env';

/**
 * A block that opens another page: a subpage of this page, or a link to a
 * page elsewhere (shown with an arrow, like Notion's "Link to page").
 */
export const PageBlock = Node.create({
  name: 'pageBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      pageId: { default: null, parseHTML: (element) => element.getAttribute('data-page-id') }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-block"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'page-block', 'data-page-id': node.attrs.pageId }),
      ['a', { href: `/notes/${node.attrs.pageId}` }, 'Page']
    ];
  },

  renderMarkdown(node) {
    const title = useWorkspace.getState().pages[node.attrs?.pageId]?.title || 'Untitled';
    return `[${title}](/notes/${node.attrs?.pageId})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBlockView);
  }
});

function PageBlockView({ node, selected }: NodeViewProps) {
  const pageId = String(node.attrs.pageId ?? '');
  const page = useWorkspace((state) => state.pages[pageId]);
  const { openPage, pageId: hostId } = useEditorEnv();
  const live = page && isLive(page);
  const linked = live && page.parentId !== hostId;
  return (
    <NodeViewWrapper className='notion-page-block' data-selected={selected || undefined}>
      <a
        href={`/notes/${pageId}`}
        draggable={false}
        onClick={(event) => {
          event.preventDefault();
          if (live) openPage(pageId);
        }}
        data-deleted={live ? undefined : 'true'}
      >
        <span className='notion-page-block-icon'>
          {live && page.icon ? page.icon : <FileText className='size-[1.15em]' strokeWidth={1.75} />}
          {linked ? <ArrowUpRight className='notion-page-block-arrow' strokeWidth={2.5} /> : null}
        </span>
        <span className='notion-page-block-title'>{live ? pageTitle(page) : page?.deletedAt ? 'Page in Trash' : 'Deleted page'}</span>
      </a>
    </NodeViewWrapper>
  );
}
