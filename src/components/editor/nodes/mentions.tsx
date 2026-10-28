import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { isLive, pageTitle } from '~/lib/pages/page';
import { useWorkspace } from '~/lib/workspace/store';
import { useEditorEnv } from '../editor-env';

/** An inline link to another page that always shows its current title. */
export const PageMention = Node.create({
  name: 'pageMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      pageId: { default: null, parseHTML: (element) => element.getAttribute('data-page-id') },
      // The title when inserted, for copies that leave the app.
      label: { default: '', parseHTML: (element) => element.textContent ?? '' }
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="page-mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-mention',
        'data-page-id': node.attrs.pageId,
        href: `/notes/${node.attrs.pageId}`
      }),
      node.attrs.label || 'Untitled'
    ];
  },

  renderText({ node }) {
    return node.attrs.label || 'Untitled';
  },

  renderMarkdown(node) {
    return `[${node.attrs?.label || 'Untitled'}](/notes/${node.attrs?.pageId})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageMentionView, { as: 'span' });
  }
});

function PageMentionView({ node }: NodeViewProps) {
  const pageId = String(node.attrs.pageId ?? '');
  const page = useWorkspace((state) => state.pages[pageId]);
  const { openPage } = useEditorEnv();
  const live = page && isLive(page);
  return (
    <NodeViewWrapper as='span' className='notion-mention' data-deleted={live ? undefined : 'true'}>
      <a
        href={`/notes/${pageId}`}
        onClick={(event) => {
          event.preventDefault();
          if (live) openPage(pageId);
        }}
        draggable={false}
      >
        <span className='notion-mention-icon'>{page?.icon ?? <FileText className='size-[1em]' />}</span>
        <span className='notion-mention-title'>{live ? pageTitle(page) : node.attrs.label || 'Deleted page'}</span>
      </a>
    </NodeViewWrapper>
  );
}

/** `@Today`, `@Tomorrow`, or a date; click to pick another. */
export const DateMention = Node.create({
  name: 'dateMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      date: { default: null, parseHTML: (element) => element.getAttribute('data-date') }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="date-mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'date-mention', 'data-date': node.attrs.date }),
      `@${formatMentionDate(node.attrs.date)}`
    ];
  },

  renderText({ node }) {
    return `@${formatMentionDate(node.attrs.date)}`;
  },

  renderMarkdown(node) {
    return `@${formatMentionDate(node.attrs?.date, false)}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateMentionView, { as: 'span' });
  }
});

export function formatMentionDate(value: unknown, relative = true) {
  if (typeof value !== 'string') return 'Date';
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return 'Date';
  if (relative) {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
  }
  return format(date, 'MMMM d, yyyy');
}

function DateMentionView({ node, updateAttributes, editor }: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const value = typeof node.attrs.date === 'string' ? parseISO(node.attrs.date) : new Date();
  return (
    <NodeViewWrapper as='span' className='notion-date-mention'>
      <Popover open={open} onOpenChange={(next) => setOpen(next && editor.isEditable)}>
        <PopoverTrigger asChild>
          <span role='button' tabIndex={-1}>
            <span className='opacity-60'>@</span>
            {formatMentionDate(node.attrs.date)}
          </span>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-auto p-0'>
          <Calendar
            mode='single'
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              if (!date) return;
              updateAttributes({ date: format(date, 'yyyy-MM-dd') });
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </NodeViewWrapper>
  );
}
