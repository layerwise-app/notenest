// Textarea helpers that need the DOM: caret coordinates (via a hidden mirror
// element with the same text metrics) and undo-friendly text replacement.
import type { EditorState } from '~/lib/markdown-format';

const MIRRORED = [
  'boxSizing',
  'width',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'fontVariationSettings',
  'letterSpacing',
  'lineHeight',
  'textTransform',
  'wordSpacing',
  'textIndent',
  'tabSize'
] as const;

/** Caret position relative to the textarea's border box. */
export function caretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  for (const property of MIRRORED) mirror.style[property] = style[property];
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.top = '0';
  mirror.style.left = '-9999px';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.overflowWrap = 'break-word';
  mirror.textContent = textarea.value.slice(0, position);
  const marker = document.createElement('span');
  marker.textContent = textarea.value.slice(position) || '.';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.5;
  const coordinates = { top: marker.offsetTop, left: marker.offsetLeft, height: lineHeight };
  mirror.remove();
  return coordinates;
}

/**
 * Applies `next` to the textarea through `insertText` so the browser's undo
 * stack keeps working, falling back to a plain value change.
 */
export function applyEditorState(
  textarea: HTMLTextAreaElement,
  next: EditorState,
  onChange: (value: string) => void
) {
  const previous = textarea.value;
  textarea.focus();
  if (next.text !== previous) {
    let head = 0;
    const max = Math.min(previous.length, next.text.length);
    while (head < max && previous[head] === next.text[head]) head += 1;
    let tail = 0;
    while (
      tail < max - head &&
      previous[previous.length - 1 - tail] === next.text[next.text.length - 1 - tail]
    ) {
      tail += 1;
    }
    textarea.setSelectionRange(head, previous.length - tail);
    const inserted = next.text.slice(head, next.text.length - tail);
    const applied = inserted
      ? document.execCommand('insertText', false, inserted)
      : document.execCommand('delete');
    if (!applied || textarea.value !== next.text) {
      textarea.value = next.text;
      onChange(next.text);
    }
  }
  textarea.setSelectionRange(next.start, next.end);
}
