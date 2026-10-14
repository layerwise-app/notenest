// Display and export formatting for notes. Pure, so it runs under node --test.
import { checklistStats, extractTags, noteSnippet } from './note-text.ts';
import type { ChecklistStats } from './note-text.ts';
import type { Note } from './notes.ts';

const timeFormat = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });
const weekdayFormat = new Intl.DateTimeFormat('en', { weekday: 'long' });
const dayFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
const fullDayFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' });
const longFormat = new Intl.DateTimeFormat('en', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Compact date for the note list: a time today, then weekday, then date. */
export function formatListDate(timestamp: number, now = new Date()) {
  const today = startOfDay(now);
  const day = 86_400_000;
  const date = new Date(timestamp);
  if (timestamp >= today) return timeFormat.format(date);
  if (timestamp >= today - day) return 'Yesterday';
  if (timestamp >= today - 6 * day) return weekdayFormat.format(date);
  return date.getFullYear() === now.getFullYear() ? dayFormat.format(date) : fullDayFormat.format(date);
}

/** "Edited just now", "Edited 9:41 AM", "Edited yesterday", "Edited Oct 3". */
export function formatEdited(timestamp: number, now = new Date()) {
  if (now.getTime() - timestamp < 60_000) return 'Edited just now';
  const label = formatListDate(timestamp, now);
  return `Edited ${label === 'Yesterday' ? 'yesterday' : label}`;
}

export function formatLongDate(timestamp: number) {
  return longFormat.format(new Date(timestamp));
}

/** The Markdown file a note exports to: its title as an H1, then the body. */
export function noteToMarkdown(note: Pick<Note, 'title' | 'content'>) {
  const title = note.title.trim();
  const body = note.content.replace(/\s+$/, '');
  if (!title) return `${body}\n`;
  return body ? `# ${title}\n\n${body}\n` : `# ${title}\n`;
}

/** A filesystem-safe `.md` name derived from the title. */
export function markdownFileName(note: Pick<Note, 'title'>) {
  const base = note.title
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'Untitled'}.md`;
}

export type NoteMeta = { tags: string[]; snippet: string; checklist: ChecklistStats };

// Notes are immutable snapshots, so derived data can be cached per object:
// typing in one note recomputes only that note while the list re-renders.
const metaCache = new WeakMap<Note, NoteMeta>();

export function noteMeta(note: Note): NoteMeta {
  let meta = metaCache.get(note);
  if (!meta) {
    meta = {
      tags: extractTags(note.content),
      snippet: noteSnippet(note.content),
      checklist: checklistStats(note.content)
    };
    metaCache.set(note, meta);
  }
  return meta;
}
