// Pure helpers that derive structure (tags, links, checklists, outline,
// stats) from a note's Markdown. Nothing here touches the DOM, so the
// helpers run under `node --test` as well as in the app. Imports between
// these helper modules use explicit `.ts` extensions for the same reason.
import type { Note } from './notes.ts';

/**
 * Regex source for `#tag` / `#nested/tag` when not glued to a word, URL, or
 * entity. Pass group names to get named captures (used by the parser).
 */
export function tagSource(name = '') {
  const group = name ? `?<${name}>` : '';
  return `(?<![\\p{L}\\p{N}_&#/\\\\])#(${group}[\\p{L}\\p{N}_][\\p{L}\\p{N}_/-]*)`;
}

/** Regex source for `[[Target]]` and `[[Target|Label]]`. */
export function wikiLinkSource(target = '', label = '') {
  const t = target ? `?<${target}>` : '';
  const l = label ? `?<${label}>` : '';
  return `\\[\\[(${t}[^\\[\\]\\n|]+?)(?:\\|(${l}[^\\[\\]\\n]+?))?\\]\\]`;
}

const TASK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+)\[([ xX])\](?=\s|$)/;
const FENCE = /^\s*(```|~~~)/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Cleans a raw tag match; returns null for tags without a letter (e.g. `#1`). */
export function normalizeTag(raw: string): string | null {
  const tag = raw.replace(/[/-]+$/, '').toLowerCase();
  return /\p{L}/u.test(tag) ? tag : null;
}

/** Splits content into lines, flagging lines inside fenced code blocks. */
export function codeAwareLines(content: string) {
  let inFence: string | null = null;
  return content.split('\n').map((text, index) => {
    const fence = FENCE.exec(text);
    if (fence) {
      const marker = fence[1];
      if (inFence === null) inFence = marker;
      else if (inFence === marker) inFence = null;
      return { text, index, code: true };
    }
    return { text, index, code: inFence !== null };
  });
}

function proseLines(content: string) {
  return codeAwareLines(content)
    .filter((line) => !line.code)
    // Inline code and link targets can contain `#`, so drop them first.
    .map((line) => ({
      ...line,
      text: line.text.replace(/`[^`\n]*`/g, ' ').replace(/\]\([^)\n]*\)/g, '] ')
    }));
}

export function extractTags(content: string): string[] {
  const tags = new Set<string>();
  const pattern = new RegExp(tagSource(), 'gu');
  for (const line of proseLines(content)) {
    for (const match of line.text.matchAll(pattern)) {
      const tag = normalizeTag(match[1]);
      if (tag) tags.add(tag);
    }
  }
  return [...tags];
}

/** True when the note carries `tag` or one of its nested children. */
export function hasTag(tags: string[], tag: string) {
  return tags.some((item) => item === tag || item.startsWith(`${tag}/`));
}

export type TagCount = { tag: string; count: number };

export function countTags(notes: Pick<Note, 'content'>[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of extractTags(note.content)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export type WikiLink = { target: string; label: string; line: number };

export function extractWikiLinks(content: string): WikiLink[] {
  const links: WikiLink[] = [];
  const pattern = new RegExp(wikiLinkSource(), 'g');
  for (const line of proseLines(content)) {
    for (const match of line.text.matchAll(pattern)) {
      const target = match[1].trim();
      if (target) links.push({ target, label: (match[2] ?? match[1]).trim(), line: line.index });
    }
  }
  return links;
}

export function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Resolves a wiki-link target to the most recently edited live note with that title. */
export function findNoteByTitle<T extends Pick<Note, 'title' | 'deletedAt' | 'updatedAt'>>(
  notes: T[],
  title: string
): T | null {
  const wanted = normalizeTitle(title);
  if (!wanted) return null;
  let found: T | null = null;
  for (const note of notes) {
    if (note.deletedAt !== null || normalizeTitle(note.title) !== wanted) continue;
    if (!found || note.updatedAt > found.updatedAt) found = note;
  }
  return found;
}

export type Backlink<T> = { note: T; excerpt: string };

/** Live notes (other than `target`) that contain a wiki link to its title. */
export function findBacklinks<T extends Note>(notes: T[], target: Pick<Note, 'id' | 'title'>): Backlink<T>[] {
  const wanted = normalizeTitle(target.title);
  if (!wanted) return [];
  const backlinks: Backlink<T>[] = [];
  for (const note of notes) {
    if (note.id === target.id || note.deletedAt !== null) continue;
    const link = extractWikiLinks(note.content).find(
      (item) => normalizeTitle(item.target) === wanted
    );
    if (link) {
      const line = note.content.split('\n')[link.line] ?? '';
      backlinks.push({ note, excerpt: truncate(plainText(line), 140) });
    }
  }
  return backlinks.sort((a, b) => b.note.updatedAt - a.note.updatedAt);
}

export type ChecklistStats = { done: number; total: number };

export function checklistStats(content: string): ChecklistStats {
  let done = 0;
  let total = 0;
  for (const line of codeAwareLines(content)) {
    if (line.code) continue;
    const task = TASK_LINE.exec(line.text);
    if (!task) continue;
    total += 1;
    if (task[2] !== ' ') done += 1;
  }
  return { done, total };
}

/** Flips the checkbox on `lineIndex`; returns the content unchanged if it isn't a task. */
export function toggleTaskLine(content: string, lineIndex: number): string {
  const lines = content.split('\n');
  const line = lines[lineIndex];
  if (line === undefined || codeAwareLines(content)[lineIndex]?.code) return content;
  const task = TASK_LINE.exec(line);
  if (!task) return content;
  const box = task[2] === ' ' ? 'x' : ' ';
  lines[lineIndex] = `${task[1]}[${box}]${line.slice(task[0].length)}`;
  return lines.join('\n');
}

export type OutlineItem = { level: number; text: string; line: number };

export function extractOutline(content: string): OutlineItem[] {
  const outline: OutlineItem[] = [];
  for (const line of codeAwareLines(content)) {
    if (line.code) continue;
    const heading = HEADING.exec(line.text);
    if (heading) {
      const text = plainText(heading[2]);
      if (text) outline.push({ level: heading[1].length, text, line: line.index });
    }
  }
  return outline;
}

/** Strips Markdown syntax for snippets, search, and counts. */
export function plainText(content: string) {
  return content
    .replace(/^\s*(```|~~~).*$/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(new RegExp(wikiLinkSource(), 'g'), (_, target: string, label?: string) => label ?? target)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/gm, '')
    .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, '')
    .replace(/(\*\*|__|~~|==|`)/g, '')
    .replace(/(^|[\s(])[*_]|[*_](?=[\s).,!?:;]|$)/gm, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** List snippet: plain text without tags, which render as chips instead. */
export function noteSnippet(content: string, maxLength = 180) {
  const withoutTags = plainText(content).replace(new RegExp(tagSource(), 'gu'), '');
  return truncate(withoutTags.replace(/\s+/g, ' ').trim(), maxLength);
}

const CJK = /[぀-ヿ㐀-䶿一-鿿가-힯]/g;

/** Counts words; CJK characters count individually since they aren't space-separated. */
export function wordCount(content: string) {
  const text = plainText(content);
  const cjk = text.match(CJK)?.length ?? 0;
  const words = text.replace(CJK, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0;
  return words + cjk;
}

export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 230));
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}
