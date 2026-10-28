// "Paste link or search pages": edits the link on the selected text.
import type { Editor } from '@tiptap/core';
import { CornerDownLeft, FileText, Globe, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isLive, pageTitle } from '~/lib/pages/page';
import { useWorkspace } from '~/lib/workspace/store';

const looksLikeUrl = (value: string) => /^(https?:\/\/|mailto:|tel:|\/)/i.test(value) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value);

export function normalizeHref(value: string) {
  const trimmed = value.trim();
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function LinkEditor({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const currentHref = (editor.getAttributes('link').href as string | undefined) ?? '';
  const [value, setValue] = useState(currentHref);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pages = useWorkspace((state) => state.pages);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const query = value.trim().toLowerCase();
  const pageMatches =
    query && !looksLikeUrl(value.trim())
      ? Object.values(pages)
          .filter((page) => isLive(page) && pageTitle(page).toLowerCase().includes(query))
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 6)
      : [];
  const options = [
    ...(value.trim() && looksLikeUrl(value.trim()) ? [{ key: 'url', href: normalizeHref(value), label: value.trim(), page: null }] : []),
    ...pageMatches.map((page) => ({ key: page.id, href: `/notes/${page.id}`, label: pageTitle(page), page }))
  ];

  function apply(href: string) {
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  }

  return (
    <div className='flex w-[340px] flex-col gap-1 p-0.5'>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            editor.commands.focus();
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIndex((current) => Math.min(current + 1, options.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIndex((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const option = options[index];
            if (option) apply(option.href);
            else if (!value.trim() && currentHref) remove();
          }
        }}
        placeholder='Paste link or search pages'
        className='notion-input w-full'
      />
      {options.map((option, optionIndex) => (
        <button
          key={option.key}
          type='button'
          data-active={optionIndex === index}
          onMouseMove={() => setIndex(optionIndex)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => apply(option.href)}
          className='notion-menu-item'
        >
          {option.page ? (
            <span className='w-5 text-center'>{option.page.icon ?? <FileText className='mx-auto size-4' strokeWidth={1.75} />}</span>
          ) : (
            <Globe className='size-4 shrink-0' />
          )}
          <span className='min-w-0 flex-1 truncate'>{option.label}</span>
          {optionIndex === index ? <CornerDownLeft className='size-3.5 text-muted-foreground' /> : null}
        </button>
      ))}
      {currentHref ? (
        <button type='button' onMouseDown={(event) => event.preventDefault()} onClick={remove} className='notion-menu-item text-muted-foreground'>
          <Trash2 className='size-4' />
          Remove link
        </button>
      ) : null}
    </div>
  );
}
