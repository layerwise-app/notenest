// The menus opened by typing `/`, `@`, `[[`, or `:` (see extensions/suggestions.ts).
import type { Editor, Range } from '@tiptap/core';
import { CalendarDays, FileText, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { loadEmojis, searchEmojis } from '~/lib/emoji-data';
import type { EmojiEntry } from '~/lib/emoji-data';
import { isLive, pageTitle } from '~/lib/pages/page';
import { ancestors } from '~/lib/pages/tree';
import { useWorkspace } from '~/lib/workspace/store';
import { cn } from '~/lib/utils';
import { insertBlocks } from '../blocks';
import { useEditorEnv } from '../editor-env';
import { closeSuggestion, suggestionKeys, useSuggestion } from '../extensions/suggestions';
import type { ActiveSuggestion } from '../extensions/suggestions';
import { formatMentionDate } from '../nodes/mentions';
import { useFloating } from './floating';
import { filterSlashItems, slashItems } from './slash-items';

type MenuItem = { key: string; group?: string; label: ReactNode; hint?: ReactNode; icon: ReactNode; description?: string; run: () => void };

export function SuggestionMenu({ editor }: { editor: Editor }) {
  const active = useSuggestion((state) => state.active);
  if (!active || !editor.isEditable) return null;
  return active.kind === 'emoji' ? (
    <EmojiSuggestion editor={editor} active={active} />
  ) : (
    <ListSuggestion key={active.kind} editor={editor} active={active} />
  );
}

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function ListSuggestion({ editor, active }: { editor: Editor; active: ActiveSuggestion }) {
  const env = useEditorEnv();
  const pages = useWorkspace((state) => state.pages);
  const { kind, query, range } = active;
  const items = buildItems();
  const [index, setIndex] = useState(0);
  const listRef = useFloating<HTMLDivElement>(active.clientRect);
  const selected = Math.min(index, Math.max(0, items.length - 1));

  useEffect(() => setIndex(0), [query]);

  function buildItems(): MenuItem[] {
    if (kind === 'slash') {
      const filtered = filterSlashItems(slashItems(env), query);
      return filtered.map((item) => ({
        key: item.id,
        group: query.trim() ? undefined : item.group,
        label: item.title,
        description: item.description,
        hint: item.shortcut,
        icon: <span className='notion-slash-icon'>{item.icon}</span>,
        run: () => item.run(editor, range)
      }));
    }
    const terms = query.toLowerCase().trim();
    const matches = Object.values(pages)
      .filter((page) => isLive(page) && page.id !== env.pageId && pageTitle(page).toLowerCase().includes(terms))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, terms ? 12 : 6);
    const insertPage = (pageId: string, label: string, at: Range) => {
      if (kind === 'link' && active.fromSlash) {
        insertBlocks(editor, { type: 'pageBlock', attrs: { pageId } }, at);
      } else {
        editor.chain().focus().insertContentAt(at, [{ type: 'pageMention', attrs: { pageId, label } }, { type: 'text', text: ' ' }]).run();
      }
    };
    const pageItems: MenuItem[] = matches.map((page) => {
      const path = ancestors(pages, page.id).map((parent) => pageTitle(parent)).join(' / ');
      return {
        key: page.id,
        group: kind === 'mention' ? 'Pages' : 'Link to page',
        label: pageTitle(page),
        description: path || undefined,
        icon: <span className='notion-menu-page-icon'>{page.icon ?? <FileText className='size-4' strokeWidth={1.75} />}</span>,
        run: () => insertPage(page.id, pageTitle(page), range)
      };
    });
    const extras: MenuItem[] = [];
    if (kind === 'mention') {
      const today = new Date();
      const dates = [
        { label: 'Today', offset: 0 },
        { label: 'Tomorrow', offset: 1 },
        { label: 'Yesterday', offset: -1 }
      ].filter((item) => !terms || item.label.toLowerCase().startsWith(terms));
      for (const item of dates) {
        const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + item.offset);
        extras.push({
          key: `date-${item.label}`,
          group: 'Date',
          label: item.label,
          hint: formatMentionDate(isoDate(date), false),
          icon: <span className='notion-menu-page-icon'><CalendarDays className='size-4' strokeWidth={1.75} /></span>,
          run: () =>
            editor
              .chain()
              .focus()
              .insertContentAt(range, [{ type: 'dateMention', attrs: { date: isoDate(date) } }, { type: 'text', text: ' ' }])
              .run()
        });
      }
    }
    const title = query.trim();
    if (title && (kind === 'link' || kind === 'mention')) {
      extras.push({
        key: 'new-page',
        group: 'New',
        label: (
          <span>
            New sub-page <span className='font-medium'>“{title}”</span>
          </span>
        ),
        icon: <span className='notion-menu-page-icon'><Plus className='size-4' /></span>,
        run: () => {
          insertPage(env.createSubpage(title), title, range);
        }
      });
    }
    return [...pageItems, ...extras];
  }

  // Close once nothing matches and the writer has moved on.
  const noResults = items.length === 0;
  useEffect(() => {
    if (noResults && (query.endsWith(' ') || query.length > 24)) closeSuggestion(editor);
  }, [noResults, query, editor]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    suggestionKeys.handler = (event) => {
      const list = itemsRef.current;
      if (event.key === 'ArrowDown') {
        setIndex((value) => (list.length ? (Math.min(value, list.length - 1) + 1) % list.length : 0));
        return true;
      }
      if (event.key === 'ArrowUp') {
        setIndex((value) => (list.length ? (Math.min(value, list.length - 1) - 1 + list.length) % list.length : 0));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = list[selectedRef.current];
        if (!item) return false;
        item.run();
        return true;
      }
      return false;
    };
    return () => {
      suggestionKeys.handler = null;
    };
  }, []);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selected, listRef]);

  return createPortal(
    <div
      ref={listRef}
      className={cn('notion-menu fixed z-50 overflow-y-auto p-1', kind === 'slash' ? 'w-[324px]' : 'w-[300px]')}
      style={{ visibility: 'hidden', left: 0, top: 0 }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {items.length ? (
        items.map((item, itemIndex) => (
          <div key={item.key}>
            {item.group && item.group !== items[itemIndex - 1]?.group ? (
              <div className='notion-menu-label'>{item.group}</div>
            ) : null}
            <button
              type='button'
              data-index={itemIndex}
              data-active={itemIndex === selected}
              className='notion-menu-item'
              onMouseMove={() => setIndex(itemIndex)}
              onClick={() => item.run()}
            >
              {item.icon}
              <span className='min-w-0 flex-1'>
                <span className='block truncate'>{item.label}</span>
                {item.description && kind !== 'slash' ? (
                  <span className='block truncate text-[12px] text-muted-foreground'>{item.description}</span>
                ) : null}
              </span>
              {item.hint ? <span className='shrink-0 text-[12px] text-muted-foreground'>{item.hint}</span> : null}
            </button>
          </div>
        ))
      ) : (
        <p className='px-2 py-1.5 text-[13px] text-muted-foreground'>No results</p>
      )}
    </div>,
    document.body
  );
}

const POPULAR = ['👍', '🎉', '✅', '🔥', '💡', '🚀', '❤️', '😀', '😂', '🙏', '👀', '⭐', '📌', '⚠️', '❗', '✨'];

function EmojiSuggestion({ editor, active }: { editor: Editor; active: ActiveSuggestion }) {
  const [emojis, setEmojis] = useState<EmojiEntry[] | null>(null);
  const [index, setIndex] = useState(0);
  const ref = useFloating<HTMLDivElement>(active.clientRect);
  const { query, range } = active;

  useEffect(() => {
    void loadEmojis().then(setEmojis);
  }, []);
  useEffect(() => setIndex(0), [query]);

  const showAll = active.fromSlash && !query;
  const results: { emoji: string; name: string }[] = !emojis
    ? []
    : showAll
      ? POPULAR.map((emoji) => ({ emoji, name: emoji }))
      : query.length >= 2
        ? searchEmojis(emojis, query, 40)
        : [];
  const selected = Math.min(index, Math.max(0, results.length - 1));

  const pick = (emoji: string) => editor.chain().focus().insertContentAt(range, emoji).run();
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    suggestionKeys.handler = (event) => {
      const list = resultsRef.current;
      if (!list.length) return false;
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 8, ArrowUp: -8 }[event.key];
      if (step) {
        setIndex((value) => Math.max(0, Math.min(list.length - 1, value + step)));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = list[selectedRef.current];
        if (!item) return false;
        pick(item.emoji);
        return true;
      }
      return false;
    };
    return () => {
      suggestionKeys.handler = null;
    };
  });

  if (!results.length) return null;
  return createPortal(
    <div
      ref={ref}
      className='notion-menu fixed z-50 w-[296px] overflow-y-auto p-1.5'
      style={{ visibility: 'hidden', left: 0, top: 0 }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className='grid grid-cols-8 gap-0.5'>
        {results.map((item, itemIndex) => (
          <button
            key={item.emoji + item.name}
            type='button'
            title={item.name}
            data-active={itemIndex === selected}
            onMouseMove={() => setIndex(itemIndex)}
            onClick={() => pick(item.emoji)}
            className='grid size-8 place-items-center rounded-md text-[20px] data-[active=true]:bg-[var(--hover-strong)]'
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <p className='truncate px-1 pt-1 text-[12px] text-muted-foreground'>:{results[selected]?.name.replace(/ /g, '_')}:</p>
    </div>,
    document.body
  );
}
