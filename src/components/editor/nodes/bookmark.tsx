// Notion's web bookmark: a card with the page's title, description, URL with
// icon, and preview image. Metadata is fetched once and kept in the attrs so
// the card renders offline; `title: null` means "not fetched yet".
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchLinkPreview } from '~/lib/link-preview.functions';
import { cn } from '~/lib/utils';
import { useEditorEnv } from '../editor-env';
import { attr, htmlAttrs } from '../media/attrs';
import { linkMarkdown } from '../media/markdown';
import { focusAfter, mediaNodeViewOptions, MediaToolbar, setAttrsQuietly, ToolbarButton, useEditable } from '../media/parts';
import { MediaPlaceholder } from '../media/placeholder';
import { safeHttpUrl } from '../media/urls';
import '../media.css';

const textAttr = (element: HTMLElement, name: string) => element.getAttribute(name) || null;

export const Bookmark = Node.create({
  name: 'bookmark',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { url: attr(null), title: attr(null), description: attr(null), image: attr(null), favicon: attr(null) };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bookmark"]',
        getAttrs: (element) => ({
          url: safeHttpUrl(element.getAttribute('data-url') ?? element.querySelector('a')?.getAttribute('href') ?? ''),
          title: element.getAttribute('data-title'),
          description: textAttr(element, 'data-description'),
          image: textAttr(element, 'data-image'),
          favicon: textAttr(element, 'data-favicon')
        })
      }
    ];
  },

  renderHTML({ node }): DOMOutputSpec {
    const { url, title, description, image, favicon } = node.attrs;
    const attrs = htmlAttrs({
      'data-type': 'bookmark',
      'data-url': url,
      'data-title': title,
      'data-description': description,
      'data-image': image,
      'data-favicon': favicon
    });
    return url ? ['div', attrs, ['a', { href: url }, title || url]] : ['div', attrs];
  },

  renderText: ({ node }) => String(node.attrs.url ?? ''),
  renderMarkdown: (node) => linkMarkdown(node.attrs?.title, node.attrs?.url),

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView, mediaNodeViewOptions);
  }
});

const httpOnly = (value: unknown) => (typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null);

function BookmarkView({ node, editor, getPos, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const editable = useEditable(editor);
  const { signedIn } = useEditorEnv();
  const url = safeHttpUrl(String(node.attrs.url ?? ''));
  const fetched = node.attrs.title !== null;
  const preview = useQuery({
    queryKey: ['link-preview', url],
    queryFn: () => fetchLinkPreview({ data: { url: url ?? '' } }),
    enabled: !!url && !fetched && signedIn && editable,
    staleTime: Infinity,
    retry: false
  });

  // Keep what came back in the document, outside undo history; '' marks a
  // page that had no title so it isn't fetched again.
  useEffect(() => {
    if (!preview.data || fetched) return;
    const { title, description, image, favicon } = preview.data;
    setAttrsQuietly(editor, getPos, { title: title ?? '', description, image, favicon });
  }, [preview.data, fetched, editor, getPos]);

  if (!url) {
    return (
      <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='bookmark'>
        <MediaPlaceholder
          kind='bookmark'
          editor={editor}
          getPos={getPos}
          selected={selected}
          onLink={(link) => {
            updateAttributes({ url: link, title: null, description: null, image: null, favicon: null });
            focusAfter(editor, getPos());
          }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='bookmark'>
      <div className='media-frame bookmark-frame'>
        <BookmarkCard
          url={url}
          loading={preview.isFetching}
          title={(node.attrs.title as string | null) || null}
          description={(node.attrs.description as string | null) || null}
          image={httpOnly(node.attrs.image)}
          favicon={httpOnly(node.attrs.favicon)}
        />
        {editable && (
          <MediaToolbar>
            <ToolbarButton label='Delete' onClick={deleteNode}>
              <Trash2 />
            </ToolbarButton>
          </MediaToolbar>
        )}
      </div>
    </NodeViewWrapper>
  );
}

type CardProps = {
  url: string;
  loading: boolean;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
};

function BookmarkCard({ url, loading, title, description, image, favicon }: CardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  return (
    <a className={cn('bookmark-card', loading && 'is-loading')} href={url} target='_blank' rel='noopener noreferrer nofollow'>
      <div className='bookmark-text'>
        <div className='bookmark-title'>{loading ? 'Loading preview…' : title || url}</div>
        {description && <div className='bookmark-description'>{description}</div>}
        <div className='bookmark-url'>
          {favicon && !iconFailed ? (
            <img src={favicon} alt='' referrerPolicy='no-referrer' onError={() => setIconFailed(true)} />
          ) : (
            <Globe />
          )}
          <span>{url}</span>
        </div>
      </div>
      {image && !imageFailed && (
        <div className='bookmark-image'>
          <img src={image} alt='' loading='lazy' referrerPolicy='no-referrer' onError={() => setImageFailed(true)} />
        </div>
      )}
    </a>
  );
}
