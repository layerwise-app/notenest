// Emoji list for the icon picker and the `:` menu. The data is large, so it
// loads on first use instead of with the app.

export type EmojiEntry = { emoji: string; name: string; search: string; group: string };

export const EMOJI_GROUPS = [
  { id: 'people', label: 'Smileys & people' },
  { id: 'animals & nature', label: 'Animals & nature' },
  { id: 'food & drink', label: 'Food & drink' },
  { id: 'activities', label: 'Activities' },
  { id: 'travel & places', label: 'Travel & places' },
  { id: 'objects', label: 'Objects' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'flags', label: 'Flags' }
] as const;

let loading: Promise<EmojiEntry[]> | null = null;

export function loadEmojis(): Promise<EmojiEntry[]> {
  loading ??= import('@tiptap/extension-emoji').then(({ emojis }) =>
    emojis.flatMap((item) => {
      if (!item.emoji || item.group === 'components' || item.name.startsWith('regional_indicator')) return [];
      // The data files smileys under an empty group; people & body joins them.
      const group = item.group === '' || item.group === 'people & body' ? 'people' : (item.group ?? 'symbols');
      const search = [item.name, ...item.shortcodes, ...item.tags].join(' ').replace(/_/g, ' ').toLowerCase();
      return [{ emoji: item.emoji, name: item.name.replace(/_/g, ' '), search, group }];
    })
  );
  return loading;
}

export function searchEmojis(list: EmojiEntry[], query: string, limit = Infinity) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return list.slice(0, limit);
  const matches: EmojiEntry[] = [];
  for (const entry of list) {
    if (terms.every((term) => entry.search.includes(term))) {
      matches.push(entry);
      if (matches.length >= limit) break;
    }
  }
  // Names that start with the query read as the best matches.
  return matches.sort((a, b) => Number(!a.name.startsWith(terms[0])) - Number(!b.name.startsWith(terms[0])));
}

const RANDOM_ICONS = ['📝', '📚', '💡', '🚀', '🌱', '🎯', '🧭', '🗂️', '✨', '🧠', '📌', '🌿', '🍀', '🔖', '🗒️', '🪴', '🌈', '☕', '🎨', '🔭'];

export const randomIcon = () => RANDOM_ICONS[Math.floor(Math.random() * RANDOM_ICONS.length)];
