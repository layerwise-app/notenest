import { Shuffle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EMOJI_GROUPS, loadEmojis, randomIcon, searchEmojis } from '~/lib/emoji-data';
import type { EmojiEntry } from '~/lib/emoji-data';
import { cn } from '~/lib/utils';

const RECENT_KEY = 'notenest.recent-emojis.v1';

function readRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 24) : [];
  } catch {
    return [];
  }
}

function rememberEmoji(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter((item) => item !== emoji)].slice(0, 24);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience.
  }
}

/** Notion-style emoji grid with search, recents, random, and remove. */
export function EmojiPicker({
  onSelect,
  onRemove,
  autoFocus = true
}: {
  onSelect: (emoji: string) => void;
  onRemove?: () => void;
  autoFocus?: boolean;
}) {
  const [emojis, setEmojis] = useState<EmojiEntry[] | null>(null);
  const [query, setQuery] = useState('');
  const [recent] = useState(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void loadEmojis().then((list) => {
      if (active) setEmojis(list);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function pick(emoji: string) {
    rememberEmoji(emoji);
    onSelect(emoji);
  }

  const results = emojis && query.trim() ? searchEmojis(emojis, query, 400) : null;

  return (
    <div className='flex w-[352px] max-w-[calc(100vw-24px)] flex-col'>
      <div className='flex items-center gap-1 border-b border-border px-2 py-1.5'>
        <span className='px-1.5 py-1 text-[13px] font-medium'>Emoji</span>
        <div className='flex-1' />
        <button
          type='button'
          className='notion-button text-[13px] text-muted-foreground'
          onClick={() => pick(randomIcon())}
          title='Random'
        >
          <Shuffle className='size-3.5' />
        </button>
        {onRemove ? (
          <button type='button' className='notion-button text-[13px] text-muted-foreground' onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <div className='p-2'>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results?.[0]) {
              event.preventDefault();
              pick(results[0].emoji);
            }
          }}
          placeholder='Filter…'
          className='notion-input w-full'
        />
      </div>
      <div className='h-[300px] overflow-y-auto px-2 pb-2'>
        {!emojis ? (
          <p className='px-1 py-6 text-center text-[13px] text-muted-foreground'>Loading…</p>
        ) : results ? (
          results.length ? (
            <EmojiGrid items={results} onPick={pick} />
          ) : (
            <p className='px-1 py-6 text-center text-[13px] text-muted-foreground'>No results</p>
          )
        ) : (
          <>
            {recent.length ? (
              <section>
                <h4 className='notion-menu-label'>Recent</h4>
                <EmojiGrid items={recent.map((emoji) => ({ emoji, name: emoji }))} onPick={pick} />
              </section>
            ) : null}
            {EMOJI_GROUPS.map((group) => (
              <section key={group.id}>
                <h4 className='notion-menu-label'>{group.label}</h4>
                <EmojiGrid items={emojis.filter((entry) => entry.group === group.id)} onPick={pick} />
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function EmojiGrid({ items, onPick }: { items: { emoji: string; name: string }[]; onPick: (emoji: string) => void }) {
  return (
    <div className='grid grid-cols-[repeat(auto-fill,32px)] justify-between'>
      {items.map((item) => (
        <button
          key={item.emoji + item.name}
          type='button'
          title={item.name}
          onClick={() => onPick(item.emoji)}
          className={cn('grid size-8 place-items-center rounded-[4px] text-[22px] leading-none hover:bg-[var(--hover)]')}
        >
          {item.emoji}
        </button>
      ))}
    </div>
  );
}
