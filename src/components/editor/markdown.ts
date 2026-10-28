// Markdown in and out of the block editor: paste, import, export, and the
// one-time conversion of notes from the Markdown notebook.
import type { JSONContent } from '@tiptap/core';
import { getSchema } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import type { PageRecord } from '~/lib/pages/page';
import { schemaExtensions } from './extensions';

let manager: MarkdownManager | null = null;
const getManager = () => (manager ??= new MarkdownManager({ extensions: schemaExtensions() }));

let schema: ReturnType<typeof getSchema> | null = null;
const getEditorSchema = () => (schema ??= getSchema(schemaExtensions()));

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Plain paragraphs, for Markdown the parser can't turn into a valid document. */
function plainDoc(markdown: string): JSONContent {
  return {
    type: 'doc',
    content: markdown.split(/\n{2,}/).map((block) => ({
      type: 'paragraph',
      content: block.trim() ? [{ type: 'text', text: block.trim() }] : undefined
    }))
  };
}

/** Parses Markdown into a document that fits the editor's schema. */
export function parseMarkdownDoc(markdown: string): JSONContent {
  if (!markdown.trim()) return EMPTY_DOC;
  try {
    const json = getManager().parse(markdown);
    // Throws when the parse produced something the schema doesn't allow.
    getEditorSchema().nodeFromJSON(json).check();
    return json;
  } catch {
    return plainDoc(markdown);
  }
}

export function docToMarkdown(json: JSONContent): string {
  return getManager().serialize(json).replace(/\n{3,}/g, '\n\n').trim();
}

const WIKI_LINK = /\[\[([^[\]\n]{1,200})\]\]/g;

/** Turns `[[Title]]` text into page mentions when a page has that title. */
function linkWikiTitles(node: JSONContent, findId: (title: string) => string | undefined): JSONContent {
  if (!node.content) return node;
  const content: JSONContent[] = [];
  for (const child of node.content) {
    const isCode = child.marks?.some((mark) => mark.type === 'code');
    if (child.type !== 'text' || !child.text || isCode || !child.text.includes('[[')) {
      content.push(linkWikiTitles(child, findId));
      continue;
    }
    let last = 0;
    for (const match of child.text.matchAll(WIKI_LINK)) {
      const id = findId(match[1].trim());
      if (!id) continue;
      if (match.index > last) content.push({ ...child, text: child.text.slice(last, match.index) });
      content.push({ type: 'pageMention', attrs: { pageId: id, label: match[1].trim() } });
      last = match.index + match[0].length;
    }
    if (last < child.text.length) content.push({ ...child, text: child.text.slice(last) });
  }
  return { ...node, content };
}

/** A converter for notebook notes, resolving `[[links]]` among `records`. */
export function createMarkdownToDoc(records: PageRecord[]) {
  const byTitle = new Map<string, string>();
  for (const record of records) {
    const key = record.title.trim().toLowerCase();
    if (key && !byTitle.has(key)) byTitle.set(key, record.id);
  }
  return (markdown: string) => {
    const doc = linkWikiTitles(parseMarkdownDoc(markdown), (title) => byTitle.get(title.toLowerCase()));
    return JSON.stringify(doc);
  };
}
