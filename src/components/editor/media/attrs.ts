// Attribute helpers for the media nodes. Their HTML is nested (figure > img),
// so each parse rule reads every attribute itself and renderHTML builds the
// markup from `node.attrs`.
import { mediaSrc } from './urls';

/** An attribute that parse rules and renderHTML handle by hand. */
export const attr = (value: unknown) => ({ default: value, rendered: false, parseHTML: () => null });

export function positiveInt(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

export type Align = 'left' | 'center' | 'right';

export const parseAlign = (value: unknown): Align => (value === 'left' || value === 'right' ? value : 'center');

const text = (value: string | null | undefined) => (value ? value : null);

/** Attrs from `<figure data-type=…>` around an img, video, or audio element. */
export function figureAttrs(element: HTMLElement, tag: 'img' | 'video' | 'audio') {
  const media = element.querySelector(tag);
  const raw = media?.getAttribute('src') ?? media?.querySelector('source')?.getAttribute('src') ?? null;
  return {
    src: mediaSrc(raw),
    caption: element.querySelector('figcaption')?.textContent?.trim() ?? '',
    width: positiveInt(element.getAttribute('data-width')),
    align: parseAlign(element.getAttribute('data-align')),
    name: text(element.getAttribute('data-name'))
  };
}

/** Attrs from a bare `<video>` or `<audio>`; false skips it when it has no usable source. */
export function playerAttrs(element: HTMLElement) {
  const src = mediaSrc(element.getAttribute('src') ?? element.querySelector('source')?.getAttribute('src'));
  return src ? { src, width: positiveInt(element.getAttribute('width')) } : false;
}

/** Drops null and undefined so they don't render as attributes. */
export function htmlAttrs(attrs: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined && value !== '') result[key] = String(value);
  }
  return result;
}
