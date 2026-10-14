// Pure text transforms behind the editor toolbar and keyboard shortcuts.
// Each takes the textarea text plus selection and returns the next state.

export type EditorState = { text: string; start: number; end: number };

export type InlineFormat = 'bold' | 'italic' | 'strike' | 'code' | 'highlight';
export type LineFormat = 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'task' | 'quote';

const INLINE_MARKERS: Record<InlineFormat, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
  highlight: '=='
};

/** Wraps the selection in a marker, or unwraps it when already wrapped. */
export function toggleInline(state: EditorState, format: InlineFormat): EditorState {
  const marker = INLINE_MARKERS[format];
  const { text, start, end } = state;
  const selected = text.slice(start, end);
  const before = text.slice(start - marker.length, start);
  const after = text.slice(end, end + marker.length);

  // A lone `*` beside `**` belongs to bold, not italic (unless it's `***`).
  const isBoldEdge = format === 'italic' && text[start - 2] === '*' && text[start - 3] !== '*';
  // `**word**` selected inside its markers: unwrap.
  if (before === marker && after === marker && !isBoldEdge) {
    return {
      text: text.slice(0, start - marker.length) + selected + text.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length
    };
  }
  // The markers are part of the selection: unwrap.
  if (selected.length >= marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(marker.length, -marker.length);
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length };
  }
  return {
    text: text.slice(0, start) + marker + selected + marker + text.slice(end),
    start: start + marker.length,
    end: end + marker.length
  };
}

const LINE_PREFIX = /^(\s*)(#{1,6}\s+|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+|>\s?)?/;

function prefixFor(format: LineFormat, index: number) {
  switch (format) {
    case 'h1': return '# ';
    case 'h2': return '## ';
    case 'h3': return '### ';
    case 'bullet': return '- ';
    case 'numbered': return `${index + 1}. `;
    case 'task': return '- [ ] ';
    case 'quote': return '> ';
  }
}

function hasFormat(prefix: string, format: LineFormat) {
  switch (format) {
    case 'h1': return prefix === '# ';
    case 'h2': return prefix === '## ';
    case 'h3': return prefix === '### ';
    case 'bullet': return /^[-*+]\s+$/.test(prefix);
    case 'numbered': return /^\d+[.)]\s+$/.test(prefix);
    case 'task': return /^[-*+]\s+\[[ xX]\]\s+$/.test(prefix);
    case 'quote': return /^>\s?$/.test(prefix);
  }
}

/**
 * Applies a block format to every line touched by the selection. If every
 * line already has it, the format is removed; other block prefixes are
 * replaced rather than stacked.
 */
export function toggleLinePrefix(state: EditorState, format: LineFormat): EditorState {
  const { text, start, end } = state;
  const blockStart = text.lastIndexOf('\n', start - 1) + 1;
  const endSearch = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = text.indexOf('\n', endSearch);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(blockStart, blockEnd).split('\n');
  const parsed = lines.map((line) => {
    const match = LINE_PREFIX.exec(line);
    return { indent: match?.[1] ?? '', prefix: match?.[2] ?? '', body: line.slice(match?.[0].length ?? 0) };
  });
  const removing = parsed.every((line) => !line.body.trim() && !line.prefix ? true : hasFormat(line.prefix, format))
    && parsed.some((line) => line.prefix);

  let counter = 0;
  const nextLines = parsed.map((line) => {
    if (removing) return line.indent + line.body;
    if (!line.body.trim() && lines.length > 1) return line.indent + line.body;
    const prefix = prefixFor(format, counter);
    counter += 1;
    return line.indent + prefix + line.body;
  });

  const replaced = nextLines.join('\n');
  const nextText = text.slice(0, blockStart) + replaced + text.slice(blockEnd);
  if (start === end && lines.length === 1) {
    // Keep the caret on the same character of the line body.
    const delta = nextLines[0].length - lines[0].length;
    const caret = Math.max(blockStart + (nextLines[0].length - parsed[0].body.length), start + delta);
    return { text: nextText, start: caret, end: caret };
  }
  return { text: nextText, start: blockStart, end: blockStart + replaced.length };
}

/** `[selection](url)` with the URL placeholder selected for quick typing. */
export function insertLink(state: EditorState): EditorState {
  const { text, start, end } = state;
  const selected = text.slice(start, end);
  if (/^https?:\/\/\S+$/.test(selected)) {
    const inserted = `[](${selected})`;
    return { text: text.slice(0, start) + inserted + text.slice(end), start: start + 1, end: start + 1 };
  }
  const label = selected || 'link';
  const inserted = `[${label}](https://)`;
  const urlStart = start + label.length + 3;
  return { text: text.slice(0, start) + inserted + text.slice(end), start: urlStart, end: urlStart + 8 };
}

/** Inserts `[[title]]`, replacing the selection or a just-typed `[[`. */
export function insertWikiLink(state: EditorState, title: string): EditorState {
  const { text, start, end } = state;
  const typedOpen = text.slice(start - 2, start) === '[[' ? 2 : 0;
  const closes = text.slice(end, end + 2) === ']]' ? 2 : 0;
  const inserted = `[[${title}]]`;
  const from = start - typedOpen;
  const nextText = text.slice(0, from) + inserted + text.slice(end + closes);
  const caret = from + inserted.length;
  return { text: nextText, start: caret, end: caret };
}

export function insertCodeBlock(state: EditorState): EditorState {
  const { text, start, end } = state;
  const selected = text.slice(start, end);
  if (!selected.includes('\n') && selected) return toggleInline(state, 'code');
  const needsLeadingBreak = start > 0 && text[start - 1] !== '\n';
  const opening = `${needsLeadingBreak ? '\n' : ''}\`\`\`\n`;
  const inserted = `${opening}${selected}\n\`\`\`\n`;
  const caret = start + opening.length;
  return { text: text.slice(0, start) + inserted + text.slice(end), start: caret, end: caret + selected.length };
}

const CONTINUE = /^(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+|>\s?)(.*)$/;

/**
 * Handles Enter inside a list, checklist, or quote: continues the marker on
 * the next line, or ends the list when the current item is empty.
 * Returns null when Enter should behave normally.
 */
export function continueList(state: EditorState): EditorState | null {
  const { text, start, end } = state;
  if (start !== end) return null;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = text.indexOf('\n', start);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;
  const line = text.slice(lineStart, lineEnd);
  const match = CONTINUE.exec(line);
  if (!match || start - lineStart < match[1].length + match[2].length) return null;

  const [, indent, marker, number, delimiter, body] = match;
  if (!body.trim()) {
    // Empty item: drop the marker and leave a blank line.
    const nextText = text.slice(0, lineStart) + text.slice(lineEnd);
    return { text: nextText, start: lineStart, end: lineStart };
  }
  let nextMarker = marker;
  if (number !== undefined) nextMarker = `${Number(number) + 1}${delimiter} `;
  else if (/\[[xX]\]/.test(marker)) nextMarker = marker.replace(/\[[xX]\]/, '[ ]');
  const insertion = `\n${indent}${nextMarker}`;
  const nextText = text.slice(0, start) + insertion + text.slice(end);
  const caret = start + insertion.length;
  return { text: nextText, start: caret, end: caret };
}

const LIST_LINE = /^(\s*)([-*+]|\d+[.)])\s+/;

/** Tab / Shift+Tab on list lines indents or outdents them by two spaces. */
export function indentListLines(state: EditorState, outdent: boolean): EditorState | null {
  const { text, start, end } = state;
  const blockStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', end);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(blockStart, blockEnd).split('\n');
  if (!lines.every((line) => LIST_LINE.test(line) || !line.trim())) return null;

  let firstDelta = 0;
  let totalDelta = 0;
  const nextLines = lines.map((line, index) => {
    if (!line.trim()) return line;
    let next = line;
    if (outdent) next = line.replace(/^( {1,2}|\t)/, '');
    else next = `  ${line}`;
    const delta = next.length - line.length;
    if (index === 0) firstDelta = delta;
    totalDelta += delta;
    return next;
  });
  const nextText = text.slice(0, blockStart) + nextLines.join('\n') + text.slice(blockEnd);
  return {
    text: nextText,
    start: Math.max(blockStart, start + firstDelta),
    end: Math.max(blockStart, end + totalDelta)
  };
}
