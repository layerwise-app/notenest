// Markdown import and export, and plain text of a page for search.
import type { JSONContent } from '@tiptap/core';
import { toast } from 'sonner';
import { absoluteFileRefs } from '~/lib/note-files';
import { pageTitle } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { createPage } from '~/lib/workspace/actions';

const loadMarkdown = () => import('~/components/editor/markdown');

async function pageMarkdown(page: Page) {
  const { docToMarkdown } = await loadMarkdown();
  const body = page.content ? docToMarkdown(JSON.parse(page.content) as JSONContent) : '';
  const heading = `# ${page.icon ? `${page.icon} ` : ''}${pageTitle(page)}`;
  // File links point at this app, so make them absolute outside it.
  return absoluteFileRefs(`${heading}\n\n${body}`.trim() + '\n', window.location.origin);
}

export function markdownFileName(page: Page) {
  const base = pageTitle(page).replace(/[\\/:*?"<>|#^[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `${base || 'Untitled'}.md`;
}

export async function copyPageMarkdown(page: Page) {
  try {
    await navigator.clipboard.writeText(await pageMarkdown(page));
    toast.success('Copied as Markdown');
  } catch {
    toast.error('Couldn’t copy to the clipboard.');
  }
}

export async function downloadPageMarkdown(page: Page) {
  const url = URL.createObjectURL(new Blob([await pageMarkdown(page)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = markdownFileName(page);
  link.click();
  // Give the download a moment to start before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A page title and body from a Markdown file (a leading `# Heading` is the title). */
export async function readMarkdownFile(file: File) {
  const { parseMarkdownDoc } = await loadMarkdown();
  const source = (await file.text()).replace(/^﻿/, '');
  const heading = /^#\s+(.+)\n?/.exec(source);
  const title = heading ? heading[1].trim() : file.name.replace(/\.(md|markdown|mdown|txt)$/i, '');
  const body = heading ? source.slice(heading[0].length) : source;
  return { title, content: JSON.stringify(parseMarkdownDoc(body)) };
}

/** Creates a page for each Markdown file; returns the first new page. */
export async function importMarkdownFiles(files: File[], parentId: string | null = null): Promise<Page | null> {
  let first: Page | null = null;
  for (const file of files) {
    const page = createPage({ parentId, ...(await readMarkdownFile(file)) });
    first ??= page;
  }
  if (files.length > 1) toast.success(`Imported ${files.length} pages`);
  return first;
}

export function pickMarkdownFiles(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.mdown,.txt,text/markdown,text/plain';
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.click();
  });
}

const textCache = new Map<string, string>();

function collectText(node: JSONContent, out: string[]) {
  if (node.text) out.push(node.text);
  if (node.type === 'pageMention' && typeof node.attrs?.label === 'string') out.push(node.attrs.label);
  if (node.type === 'callout' && typeof node.attrs?.icon === 'string') out.push(node.attrs.icon);
  for (const child of node.content ?? []) collectText(child, out);
  if (node.type && node.type !== 'text' && !node.text) out.push(' ');
}

/** The page body as plain text (cached by content). */
export function pagePlainText(content: string): string {
  if (!content) return '';
  const cached = textCache.get(content);
  if (cached !== undefined) return cached;
  let text = '';
  try {
    const out: string[] = [];
    collectText(JSON.parse(content) as JSONContent, out);
    text = out.join('').replace(/\s+/g, ' ').trim();
  } catch {
    text = '';
  }
  if (textCache.size > 500) textCache.clear();
  textCache.set(content, text);
  return text;
}

export function wordCount(content: string) {
  const text = pagePlainText(content);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}
