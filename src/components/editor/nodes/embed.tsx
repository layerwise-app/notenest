// "Embed anything": an iframe for a link, with provider URLs (YouTube, Figma,
// Maps, …) turned into their embeddable form.
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Code, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { attr, htmlAttrs, positiveInt } from '../media/attrs';
import { EmbedFrame, isSameOrigin } from '../media/embed-frame';
import { linkMarkdown } from '../media/markdown';
import { focusAfter, mediaNodeViewOptions, MediaToolbar, ToolbarButton, useEditable } from '../media/parts';
import { MediaPlaceholder } from '../media/placeholder';
import { embedTarget, safeHttpUrl } from '../media/urls';
import '../media.css';

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { url: attr(null), height: attr(null) };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="embed"]',
        getAttrs: (element) => ({
          url: safeHttpUrl(element.getAttribute('data-url') ?? ''),
          height: positiveInt(element.getAttribute('data-height'))
        })
      },
      {
        tag: 'iframe[src]',
        getAttrs: (element) => {
          const src = element.getAttribute('src') ?? '';
          const url = /^https?:\/\//i.test(src) ? safeHttpUrl(src) : null;
          return url ? { url, height: positiveInt(element.getAttribute('height')) } : false;
        }
      }
    ];
  },

  renderHTML({ node }): DOMOutputSpec {
    const { url, height } = node.attrs;
    const attrs = htmlAttrs({ 'data-type': 'embed', 'data-url': url, 'data-height': height });
    return url ? ['div', attrs, ['a', { href: url }, url]] : ['div', attrs];
  },

  renderText: ({ node }) => String(node.attrs.url ?? ''),
  renderMarkdown: (node) => linkMarkdown(null, node.attrs?.url),

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView, mediaNodeViewOptions);
  }
});

function EmbedView({ node, editor, getPos, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const editable = useEditable(editor);
  const url = safeHttpUrl(String(node.attrs.url ?? ''));
  if (!url) {
    return (
      <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='embed'>
        <MediaPlaceholder
          kind='embed'
          editor={editor}
          getPos={getPos}
          selected={selected}
          onLink={(link) => {
            updateAttributes({ url: link, height: null });
            focusAfter(editor, getPos());
          }}
        />
      </NodeViewWrapper>
    );
  }

  const target = embedTarget(url);
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='embed'>
      <div className='media-frame embed-frame'>
        {target && !isSameOrigin(target.src) ? (
          <EmbedFrame
            key={target.src}
            target={target}
            title={url}
            height={node.attrs.height as number | null}
            onHeight={editable ? (height) => updateAttributes({ height }) : undefined}
          />
        ) : (
          <div className='media-placeholder is-error'>
            <Code className='media-placeholder-icon' />
            <span className='media-error-text'>This link can’t be embedded</span>
          </div>
        )}
        <MediaToolbar>
          <ToolbarButton label='Open original' href={url}>
            <ExternalLink />
          </ToolbarButton>
          {editable && (
            <ToolbarButton label='Delete' onClick={deleteNode}>
              <Trash2 />
            </ToolbarButton>
          )}
        </MediaToolbar>
      </div>
    </NodeViewWrapper>
  );
}
