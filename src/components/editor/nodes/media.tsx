// Image, video, audio, and file blocks. An empty block (no `src`) shows
// Notion's "Add an image"-style placeholder; `uploadId` marks a block whose
// file is still uploading (see ../media/upload-store.ts).
import { Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { attr, figureAttrs, htmlAttrs, playerAttrs, positiveInt } from '../media/attrs';
import { ImageView } from '../media/image-view';
import { imageMarkdown, ImageParagraphs, inlineImageText, linkMarkdown } from '../media/markdown';
import { mediaNodeViewOptions } from '../media/parts';
import { AudioView, FileView, VideoView } from '../media/player-views';
import { fileNameFromUrl, mediaSrc } from '../media/urls';
import '../media.css';

const linkLabel = (attrs: Record<string, unknown> | undefined) => {
  const src = typeof attrs?.src === 'string' ? attrs.src : '';
  const name = typeof attrs?.name === 'string' ? attrs.name : '';
  const caption = typeof attrs?.caption === 'string' ? attrs.caption : '';
  return name || caption || (src ? fileNameFromUrl(src) : '');
};

function figureSpec(type: string, attrs: Record<string, unknown>, media: DOMOutputSpec | null, caption: string): DOMOutputSpec {
  const figure = htmlAttrs({ 'data-type': type, ...attrs });
  if (!media) return ['figure', figure];
  return caption ? ['figure', figure, media, ['figcaption', caption]] : ['figure', figure, media];
}

export const ImageBlock = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: attr(null),
      caption: attr(''),
      width: attr(null),
      align: attr('center'),
      uploadId: attr(null),
      name: attr(null)
    };
  },

  addExtensions() {
    return [ImageParagraphs];
  },

  parseHTML() {
    return [
      { tag: 'figure[data-type="image"]', getAttrs: (element) => figureAttrs(element, 'img') },
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          const src = mediaSrc(element.getAttribute('src'));
          return src ? { src, width: positiveInt(element.getAttribute('width')) } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    const { src, caption, width, align, name } = node.attrs;
    const img: DOMOutputSpec | null = src ? ['img', htmlAttrs({ src, alt: caption || name || '', width })] : null;
    return figureSpec('image', { 'data-align': align, 'data-width': width, 'data-name': name }, img, caption);
  },

  renderText: ({ node }) => String(node.attrs.src ?? ''),

  // Inline images (in headings, links, table cells); ImageParagraphs turns
  // paragraphs with images into image blocks first.
  markdownTokenName: 'image',
  parseMarkdown: (token) => inlineImageText(token),
  renderMarkdown: (node) => imageMarkdown(node.attrs?.src, node.attrs?.caption),

  addNodeView() {
    return ReactNodeViewRenderer(ImageView, mediaNodeViewOptions);
  }
});

export const VideoBlock = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: attr(null), caption: attr(''), width: attr(null), uploadId: attr(null), name: attr(null) };
  },

  parseHTML() {
    return [
      { tag: 'figure[data-type="video"]', getAttrs: (element) => figureAttrs(element, 'video') },
      { tag: 'video', getAttrs: (element) => playerAttrs(element) }
    ];
  },

  renderHTML({ node }) {
    const { src, caption, width, name } = node.attrs;
    const video: DOMOutputSpec | null = src ? ['video', { src, controls: 'controls', preload: 'metadata' }] : null;
    return figureSpec('video', { 'data-width': width, 'data-name': name }, video, caption);
  },

  renderText: ({ node }) => String(node.attrs.src ?? ''),
  renderMarkdown: (node) => linkMarkdown(linkLabel(node.attrs), node.attrs?.src),

  addNodeView() {
    return ReactNodeViewRenderer(VideoView, mediaNodeViewOptions);
  }
});

export const AudioBlock = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: attr(null), caption: attr(''), uploadId: attr(null), name: attr(null) };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-type="audio"]',
        getAttrs: (element) => {
          const { src, caption, name } = figureAttrs(element, 'audio');
          return { src, caption, name };
        }
      },
      {
        tag: 'audio',
        getAttrs: (element) => {
          const attrs = playerAttrs(element);
          return attrs && { src: attrs.src };
        }
      }
    ];
  },

  renderHTML({ node }) {
    const { src, caption, name } = node.attrs;
    const audio: DOMOutputSpec | null = src ? ['audio', { src, controls: 'controls', preload: 'metadata' }] : null;
    return figureSpec('audio', { 'data-name': name }, audio, caption);
  },

  renderText: ({ node }) => String(node.attrs.src ?? ''),
  renderMarkdown: (node) => linkMarkdown(linkLabel(node.attrs), node.attrs?.src),

  addNodeView() {
    return ReactNodeViewRenderer(AudioView, mediaNodeViewOptions);
  }
});

export const FileBlock = Node.create({
  name: 'fileBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { src: attr(null), name: attr(null), size: attr(null), contentType: attr(null), uploadId: attr(null) };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="fileBlock"]',
        getAttrs: (element) => {
          const link = element.querySelector('a');
          return {
            src: mediaSrc(link?.getAttribute('href')),
            name: element.getAttribute('data-name') || link?.textContent?.trim() || null,
            size: positiveInt(element.getAttribute('data-size')),
            contentType: element.getAttribute('data-content-type') || null
          };
        }
      }
    ];
  },

  renderHTML({ node }): DOMOutputSpec {
    const { src, name, size, contentType } = node.attrs;
    const attrs = htmlAttrs({ 'data-type': 'fileBlock', 'data-name': name, 'data-size': size, 'data-content-type': contentType });
    return src ? ['div', attrs, ['a', { href: src }, name || fileNameFromUrl(src)]] : ['div', attrs];
  },

  renderText: ({ node }) => String(node.attrs.name ?? node.attrs.src ?? ''),
  renderMarkdown: (node) => linkMarkdown(linkLabel(node.attrs), node.attrs?.src),

  addNodeView() {
    return ReactNodeViewRenderer(FileView, mediaNodeViewOptions);
  }
});
