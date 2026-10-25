// A small, dependency-free Markdown parser that produces a typed tree.
// Rendering happens in React (which escapes all text), and link targets go
// through `safeUrl`, so note content can never inject markup or scripts.
// Attached files only render from `/api/files/<uuid>` references (`fileId`).
import { fileRefId } from './note-files.ts';
import { normalizeTag, tagSource, wikiLinkSource } from './note-text.ts';

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em' | 'del' | 'mark'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }
  | { type: 'image'; fileId: string; alt: string }
  | { type: 'file'; fileId: string; children: Inline[] }
  | { type: 'wikilink'; target: string; label: string }
  | { type: 'tag'; tag: string; text: string }
  | { type: 'br' };

export type ListItem = {
  line: number;
  depth: number;
  marker: 'bullet' | number;
  task: boolean | null;
  children: Inline[];
};

export type Block =
  | { type: 'heading'; level: number; line: number; children: Inline[] }
  | { type: 'paragraph'; line: number; children: Inline[] }
  | { type: 'list'; ordered: boolean; line: number; items: ListItem[] }
  | { type: 'quote'; line: number; paragraphs: Inline[][] }
  | { type: 'code'; line: number; lang: string; text: string }
  | { type: 'table'; line: number; head: Inline[][]; rows: Inline[][][]; align: ('left' | 'center' | 'right' | null)[] }
  | { type: 'hr'; line: number };

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** Returns a navigable URL or null; blocks `javascript:`, `data:`, and friends. */
export function safeUrl(raw: string): string | null {
  // Browsers ignore control characters and whitespace inside schemes
  // (`java\nscript:`), so strip them before checking the protocol.
  const href = raw.replace(/[\u0000- \u007f]/g, '');
  if (!href) return null;
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href);
  if (scheme) return SAFE_PROTOCOLS.has(`${scheme[1].toLowerCase()}:`) ? href : null;
  if (/^www\./i.test(href)) return `https://${href}`;
  return null;
}

const INLINE_PATTERN = new RegExp(
  [
    '`(?<code>[^`\\n]+)`',
    wikiLinkSource('wiki', 'wikiLabel'),
    '!\\[(?<imageAlt>[^\\]\\n]*)\\]\\((?<imageSrc>[^)\\s]+)(?:\\s+"[^"\\n]*")?\\)',
    '\\[(?<linkText>[^\\]\\n]+)\\]\\((?<linkHref>[^)\\s]+)(?:\\s+"[^"\\n]*")?\\)',
    '(?<url>https?:\\/\\/[^\\s<>()]*[^\\s<>().,;:!?\'"*_~])',
    '\\*\\*(?<strong>[^\\n]+?)\\*\\*',
    '(?<![\\p{L}\\p{N}_])__(?<strong2>[^\\n]+?)__(?![\\p{L}\\p{N}_])',
    '~~(?<del>[^\\n]+?)~~',
    '==(?<mark>[^\\n]+?)==',
    '\\*(?<em>[^\\s*](?:[^\\n]*?[^\\s*])?)\\*',
    '(?<![\\p{L}\\p{N}_])_(?<em2>[^\\s_](?:[^\\n]*?[^\\s_])?)_(?![\\p{L}\\p{N}_])',
    tagSource('tag')
  ].join('|'),
  'gu'
);

export function parseInline(text: string): Inline[] {
  const nodes: Inline[] = [];
  let last = 0;
  const pushText = (value: string) => {
    if (!value) return;
    const previous = nodes[nodes.length - 1];
    if (previous?.type === 'text') previous.text += value;
    else nodes.push({ type: 'text', text: value });
  };
  const pushNodes = (children: Inline[]) => {
    for (const child of children) child.type === 'text' ? pushText(child.text) : nodes.push(child);
  };

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const groups = match.groups ?? {};
    const start = match.index ?? 0;
    pushText(text.slice(last, start));
    last = start + match[0].length;

    if (groups.code !== undefined) {
      nodes.push({ type: 'code', text: groups.code });
    } else if (groups.wiki !== undefined) {
      const target = groups.wiki.trim();
      nodes.push({ type: 'wikilink', target, label: (groups.wikiLabel ?? target).trim() });
    } else if (groups.imageSrc !== undefined) {
      const fileId = fileRefId(groups.imageSrc);
      if (fileId) nodes.push({ type: 'image', fileId, alt: groups.imageAlt.trim() });
      else {
        // Only attached files render as images; anything else reads as before.
        pushText('!');
        pushNodes(parseInline(match[0].slice(1)));
      }
    } else if (groups.linkText !== undefined) {
      const href = safeUrl(groups.linkHref);
      const fileId = href ? null : fileRefId(groups.linkHref);
      const children = parseInline(groups.linkText);
      if (href) nodes.push({ type: 'link', href, children });
      else if (fileId) nodes.push({ type: 'file', fileId, children });
      else pushNodes(children);
    } else if (groups.url !== undefined) {
      const href = safeUrl(groups.url);
      if (href) nodes.push({ type: 'link', href, children: [{ type: 'text', text: groups.url }] });
      else pushText(groups.url);
    } else if (groups.strong !== undefined || groups.strong2 !== undefined) {
      nodes.push({ type: 'strong', children: parseInline(groups.strong ?? groups.strong2) });
    } else if (groups.del !== undefined) {
      nodes.push({ type: 'del', children: parseInline(groups.del) });
    } else if (groups.mark !== undefined) {
      nodes.push({ type: 'mark', children: parseInline(groups.mark) });
    } else if (groups.em !== undefined || groups.em2 !== undefined) {
      nodes.push({ type: 'em', children: parseInline(groups.em ?? groups.em2) });
    } else if (groups.tag !== undefined) {
      const tag = normalizeTag(groups.tag);
      if (tag) {
        // Keep trailing `/` or `-` as plain text rather than part of the tag.
        const text = `#${groups.tag.slice(0, tag.length)}`;
        nodes.push({ type: 'tag', tag, text });
        pushText(match[0].slice(text.length));
      } else {
        pushText(match[0]);
      }
    }
  }
  pushText(text.slice(last));
  return nodes;
}

const FENCE_OPEN = /^\s*(```|~~~)\s*([\w+#.-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s*>\s?/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\](?:\s+(.*))?$/;
const TABLE_DIVIDER = /^(?=.*\|)\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isBlockStart(line: string, next: string | undefined) {
  return (
    FENCE_OPEN.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) ||
    LIST_ITEM.test(line) || (line.includes('|') && next !== undefined && TABLE_DIVIDER.test(next))
  );
}

export function parseMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      const start = index;
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith(fence[1])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1; // closing fence (or end of note)
      blocks.push({ type: 'code', line: start, lang: fence[2], text: body.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, line: index, children: parseInline(heading[2]) });
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'hr', line: index });
      index += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const start = index;
      const paragraphs: Inline[][] = [];
      let current: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index])) {
        const text = lines[index].replace(QUOTE, '');
        if (text.trim()) current.push(text);
        else if (current.length) {
          paragraphs.push(joinLines(current));
          current = [];
        }
        index += 1;
      }
      if (current.length) paragraphs.push(joinLines(current));
      blocks.push({ type: 'quote', line: start, paragraphs });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const start = index;
      const items: ListItem[] = [];
      let match: RegExpExecArray | null;
      while (index < lines.length && (match = LIST_ITEM.exec(lines[index]))) {
        const indent = match[1].replace(/\t/g, '  ').length;
        const depth = Math.min(Math.floor(indent / 2), 4);
        const marker = /\d/.test(match[2]) ? Number.parseInt(match[2], 10) : 'bullet';
        // Switching between bullets and numbers at the top level starts a new list.
        if (items.length && depth === 0 && (marker === 'bullet') !== (items[0].marker === 'bullet')) break;
        const task = TASK.exec(match[3]);
        items.push({
          line: index,
          depth,
          marker,
          task: task ? task[1] !== ' ' : null,
          children: parseInline(task ? task[2] ?? '' : match[3])
        });
        index += 1;
      }
      blocks.push({ type: 'list', ordered: items[0].marker !== 'bullet', line: start, items });
      continue;
    }

    if (line.includes('|') && TABLE_DIVIDER.test(lines[index + 1] ?? '')) {
      const start = index;
      const head = splitRow(line);
      const align = splitRow(lines[index + 1]).map((cell) =>
        cell.startsWith(':') && cell.endsWith(':') ? 'center' : cell.endsWith(':') ? 'right' : cell.startsWith(':') ? 'left' : null
      );
      index += 2;
      const rows: Inline[][][] = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(splitRow(lines[index]).slice(0, head.length).map(parseInline));
        index += 1;
      }
      blocks.push({ type: 'table', line: start, head: head.map(parseInline), rows, align });
      continue;
    }

    const start = index;
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && (index === start || !isBlockStart(lines[index], lines[index + 1]))) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', line: start, children: joinLines(paragraph) });
  }

  return blocks;
}

/** Soft line breaks are kept as visible breaks, like most note apps. */
function joinLines(lines: string[]): Inline[] {
  return lines.flatMap((line, index) =>
    index ? [{ type: 'br' } as Inline, ...parseInline(line)] : parseInline(line)
  );
}
