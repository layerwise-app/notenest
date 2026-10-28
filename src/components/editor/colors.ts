// Notion's color names. Documents store the name; CSS maps each name to a
// light and dark value (see editor.css), so colors follow the theme.

export const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'] as const;
export type ColorName = (typeof COLORS)[number];

export const COLOR_LABELS: Record<ColorName, string> = {
  gray: 'Gray',
  brown: 'Brown',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  pink: 'Pink',
  red: 'Red'
};

export const isColorName = (value: unknown): value is ColorName =>
  typeof value === 'string' && (COLORS as readonly string[]).includes(value);

/** A block color: a text color (`red`) or a background (`red_background`). */
export type BlockColor = ColorName | `${ColorName}_background`;

export function parseBlockColor(value: unknown): BlockColor | null {
  if (typeof value !== 'string') return null;
  const base = value.endsWith('_background') ? value.slice(0, -11) : value;
  return isColorName(base) ? (value as BlockColor) : null;
}
