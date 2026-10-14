// Formatting commands shared by the toolbar, keyboard shortcuts, and palette.
import {
  insertCodeBlock,
  insertLink,
  toggleInline,
  toggleLinePrefix
} from '~/lib/markdown-format';
import type { EditorState } from '~/lib/markdown-format';

export type FormatCommandId =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'highlight'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bullet'
  | 'numbered'
  | 'task'
  | 'quote'
  | 'codeblock'
  | 'link';

type FormatCommand = {
  label: string;
  keys?: string;
  run: (state: EditorState) => EditorState;
};

export const FORMAT_COMMANDS: Record<FormatCommandId, FormatCommand> = {
  bold: { label: 'Bold', keys: '⌘B', run: (s) => toggleInline(s, 'bold') },
  italic: { label: 'Italic', keys: '⌘I', run: (s) => toggleInline(s, 'italic') },
  strike: { label: 'Strikethrough', keys: '⌘⇧X', run: (s) => toggleInline(s, 'strike') },
  code: { label: 'Inline code', keys: '⌘E', run: (s) => toggleInline(s, 'code') },
  highlight: { label: 'Highlight', keys: '⌘⇧H', run: (s) => toggleInline(s, 'highlight') },
  h1: { label: 'Heading 1', keys: '⌥⌘1', run: (s) => toggleLinePrefix(s, 'h1') },
  h2: { label: 'Heading 2', keys: '⌥⌘2', run: (s) => toggleLinePrefix(s, 'h2') },
  h3: { label: 'Heading 3', keys: '⌥⌘3', run: (s) => toggleLinePrefix(s, 'h3') },
  bullet: { label: 'Bulleted list', keys: '⌘⇧8', run: (s) => toggleLinePrefix(s, 'bullet') },
  numbered: { label: 'Numbered list', keys: '⌘⇧7', run: (s) => toggleLinePrefix(s, 'numbered') },
  task: { label: 'Checklist', keys: '⌘⇧9', run: (s) => toggleLinePrefix(s, 'task') },
  quote: { label: 'Quote', keys: '⌘⇧.', run: (s) => toggleLinePrefix(s, 'quote') },
  codeblock: { label: 'Code block', keys: '⌥⌘C', run: insertCodeBlock },
  link: { label: 'Link', keys: '⌘⇧K', run: insertLink }
};

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

/** Maps a keydown to a formatting command. Uses `code` where Shift/Option change `key`. */
export function formatCommandForKey(event: KeyLike): FormatCommandId | null {
  if (!(event.metaKey || event.ctrlKey)) return null;
  const key = event.key.toLowerCase();
  if (event.altKey) {
    if (event.shiftKey) return null;
    if (event.code === 'Digit1') return 'h1';
    if (event.code === 'Digit2') return 'h2';
    if (event.code === 'Digit3') return 'h3';
    if (event.code === 'KeyC') return 'codeblock';
    return null;
  }
  if (!event.shiftKey) {
    if (key === 'b') return 'bold';
    if (key === 'i') return 'italic';
    if (key === 'e') return 'code';
    return null;
  }
  if (key === 'x') return 'strike';
  if (key === 'h') return 'highlight';
  if (key === 'k') return 'link';
  if (event.code === 'Digit7') return 'numbered';
  if (event.code === 'Digit8') return 'bullet';
  if (event.code === 'Digit9') return 'task';
  if (event.code === 'Period') return 'quote';
  return null;
}
