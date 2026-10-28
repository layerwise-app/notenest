// Markdown for media blocks. Images are inline tokens in Markdown but blocks
// here, so a paragraph holding images is split into paragraphs and image
// blocks before the regular paragraph parser sees it.
import { Extension } from '@tiptap/core';
import type { JSONContent, MarkdownParseHelpers, MarkdownToken } from '@tiptap/core';
import { mediaSrc } from './urls';

const URL_UNSAFE = /[\s()<>]/g;

/** Escapes text for a Markdown link label (`[label]`). */
export function markdownLabel(text: string) {
  return text.replace(/\s+/g, ' ').trim().replace(/([\\[\]])/g, '\\$1');
}

/** Percent-encodes the characters that would end a Markdown link target early. */
export function markdownUrl(url: string) {
  return url.replace(URL_UNSAFE, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
}

export function imageMarkdown(src: unknown, caption: unknown) {
  if (typeof src !== 'string' || !src) return '';
  return `![${markdownLabel(typeof caption === 'string' ? caption : '')}](${markdownUrl(src)})`;
}

export function linkMarkdown(label: unknown, url: unknown) {
  if (typeof url !== 'string' || !url) return '';
  const text = typeof label === 'string' && label.trim() ? label : url;
  return `[${markdownLabel(text)}](${markdownUrl(url)})`;
}

/** An image token as an image block, or null when its URL isn't one we show. */
export function imageBlockFromToken(token: MarkdownToken): JSONContent | null {
  const src = mediaSrc(token.href);
  if (!src) return null;
  return { type: 'image', attrs: { src, caption: typeof token.text === 'string' ? token.text : '' } };
}

/**
 * An image token inside other inline content (a heading, a link, a table
 * cell), where a block can't go: keep its alt text.
 */
export function inlineImageText(token: MarkdownToken): JSONContent[] {
  const text = typeof token.text === 'string' && token.text.trim() ? token.text : mediaSrc(token.href);
  return text ? [{ type: 'text', text }] : [];
}

const isBlank = (token: MarkdownToken) =>
  token.type === 'br' || (token.type === 'text' && !String(token.text ?? '').trim());

/** Soft line breaks next to a removed image aren't text worth keeping. */
function trimRun(run: MarkdownToken[]) {
  const tokens = run.slice();
  const first = tokens[0];
  if (first?.type === 'text') tokens[0] = { ...first, text: String(first.text ?? '').replace(/^\s*\n/, '') };
  const lastIndex = tokens.length - 1;
  const last = tokens[lastIndex];
  if (last?.type === 'text') tokens[lastIndex] = { ...last, text: String(last.text ?? '').replace(/\n\s*$/, '') };
  return tokens;
}

function splitImageParagraph(token: MarkdownToken, helpers: MarkdownParseHelpers): JSONContent[] {
  const tokens = token.tokens ?? [];
  // An empty result hands the token to the regular paragraph parser.
  if (!tokens.some((child) => child.type === 'image')) return [];
  const blocks: JSONContent[] = [];
  let run: MarkdownToken[] = [];
  const flush = () => {
    if (run.some((child) => !isBlank(child))) {
      blocks.push(helpers.createNode('paragraph', undefined, helpers.parseInline(trimRun(run))));
    }
    run = [];
  };
  for (const child of tokens) {
    const image = child.type === 'image' ? imageBlockFromToken(child) : null;
    if (image) {
      flush();
      blocks.push(image);
    } else {
      run.push(child);
    }
  }
  flush();
  return blocks;
}

/** Registered by the image block; runs ahead of the paragraph parser (priority 1000). */
export const ImageParagraphs = Extension.create({
  name: 'imageParagraphs',
  priority: 1001,
  markdownTokenName: 'paragraph',
  parseMarkdown: (token, helpers) => splitImageParagraph(token, helpers)
});
