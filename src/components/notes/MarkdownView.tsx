import { Check, ImageOff, Paperclip } from 'lucide-react';
import { useState } from 'react';
import type * as React from 'react';
import { parseMarkdown } from '~/lib/markdown';
import type { Block, Inline, ListItem } from '~/lib/markdown';
import { filePath } from '~/lib/note-files';
import { cn } from '~/lib/utils';

// Renders the parsed Markdown tree with React elements only. React escapes
// all text and `parseMarkdown` only emits safe link targets, so note content
// can't inject HTML. Attachments are built from validated file IDs.

export type MarkdownActions = {
  /** Whether a wiki link target resolves to an existing note. */
  hasNote?: (title: string) => boolean;
  onOpenLink?: (title: string) => void;
  onTagClick?: (tag: string) => void;
  /** Called with the source line of a task item; omit to render read-only. */
  onToggleTask?: (line: number) => void;
};

type MarkdownViewProps = MarkdownActions & {
  content: string;
  compact?: boolean;
  className?: string;
};

export function MarkdownView({ content, compact, className, ...actions }: MarkdownViewProps) {
  const blocks = parseMarkdown(content);
  return (
    <div
      className={cn(
        'font-serif break-words text-ink-soft [&>*:first-child]:mt-0',
        compact ? 'text-[16.5px] leading-[1.7]' : 'text-[18px] leading-[1.75]',
        className
      )}
    >
      {blocks.map((block) => (
        <BlockView key={`${block.type}-${block.line}`} block={block} actions={actions} />
      ))}
    </div>
  );
}

const HEADING_STYLES: Record<number, string> = {
  1: 'mt-10 mb-4 text-[1.6em] leading-tight font-semibold tracking-[-0.015em]',
  2: 'mt-9 mb-3 text-[1.3em] leading-snug font-semibold tracking-[-0.01em]',
  3: 'mt-7 mb-2 text-[1.12em] leading-snug font-semibold',
  4: 'mt-6 mb-2 text-[1em] font-semibold',
  5: 'mt-6 mb-2 text-[1em] font-semibold',
  6: 'mt-6 mb-2 text-[0.95em] font-semibold text-muted-foreground'
};

function BlockView({ block, actions }: { block: Block; actions: MarkdownActions }) {
  switch (block.type) {
    case 'heading': {
      const Tag = `h${block.level}` as 'h1';
      return (
        <Tag
          id={`line-${block.line}`}
          data-line={block.line}
          className={cn('scroll-mt-20 text-foreground', HEADING_STYLES[block.level])}
        >
          <InlineView nodes={block.children} actions={actions} />
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p className='my-4'>
          <InlineView nodes={block.children} actions={actions} />
        </p>
      );
    case 'list':
      return <ListView items={block.items} actions={actions} />;
    case 'quote':
      return (
        <blockquote className='my-5 border-l-2 border-primary/40 pl-4 text-muted-foreground italic'>
          {block.paragraphs.map((paragraph, index) => (
            <p key={index} className='my-2'>
              <InlineView nodes={paragraph} actions={actions} />
            </p>
          ))}
        </blockquote>
      );
    case 'code':
      return (
        <div className='group/code relative my-5'>
          {block.lang ? (
            <span className='absolute top-2 right-3 font-sans text-[11px] text-muted-foreground'>
              {block.lang}
            </span>
          ) : null}
          <pre className='overflow-x-auto rounded-lg border border-border bg-muted/60 px-4 py-3 font-mono text-[13.5px] leading-relaxed text-foreground'>
            <code>{block.text}</code>
          </pre>
        </div>
      );
    case 'table':
      return (
        <div className='my-5 overflow-x-auto rounded-lg border border-border'>
          <table className='w-full border-collapse font-sans text-[14px] leading-normal'>
            <thead className='bg-muted/60'>
              <tr>
                {block.head.map((cell, index) => (
                  <th
                    key={index}
                    style={{ textAlign: block.align[index] ?? 'left' }}
                    className='border-b border-border px-3 py-2 font-semibold text-foreground'
                  >
                    <InlineView nodes={cell} actions={actions} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className='border-b border-border/70 last:border-0'>
                  {block.head.map((_, index) => (
                    <td key={index} style={{ textAlign: block.align[index] ?? 'left' }} className='px-3 py-2'>
                      <InlineView nodes={row[index] ?? []} actions={actions} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'hr':
      return <hr className='my-8 border-border' />;
  }
}

const BULLETS = ['•', '◦', '▪'];

function ListView({ items, actions }: { items: ListItem[]; actions: MarkdownActions }) {
  return (
    <ul role='list' className='my-4 space-y-1'>
      {items.map((item) => (
        <li
          key={item.line}
          className='flex gap-2.5'
          style={{ paddingLeft: `${item.depth * 1.5}em` }}
        >
          {item.task !== null ? (
            <TaskBox item={item} onToggle={actions.onToggleTask} />
          ) : (
            <span
              aria-hidden='true'
              className={cn(
                'shrink-0 text-right text-muted-foreground tabular-nums select-none',
                item.marker === 'bullet' ? 'w-3 text-center' : 'min-w-[1.1em]'
              )}
            >
              {item.marker === 'bullet' ? BULLETS[item.depth % BULLETS.length] : `${item.marker}.`}
            </span>
          )}
          <span
            className={cn(
              'min-w-0 flex-1',
              item.task && 'text-muted-foreground line-through decoration-muted-foreground/50'
            )}
          >
            <InlineView nodes={item.children} actions={actions} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function TaskBox({ item, onToggle }: { item: ListItem; onToggle?: (line: number) => void }) {
  const checked = Boolean(item.task);
  return (
    <button
      type='button'
      role='checkbox'
      aria-checked={checked}
      aria-label={`${checked ? 'Uncheck' : 'Check'} “${inlineText(item.children) || 'task'}”`}
      disabled={!onToggle}
      onClick={() => onToggle?.(item.line)}
      className={cn(
        'mt-[0.36em] grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-default',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-paper enabled:hover:border-primary/60'
      )}
    >
      {checked ? <Check className='size-3' strokeWidth={3} /> : null}
    </button>
  );
}

function inlineText(nodes: Inline[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'text' || node.type === 'code') return node.text;
      if (node.type === 'image') return node.alt;
      if (node.type === 'tag') return node.text;
      if (node.type === 'wikilink') return node.label;
      if (node.type === 'br') return ' ';
      return inlineText(node.children);
    })
    .join('');
}

function InlineView({ nodes, actions }: { nodes: Inline[]; actions: MarkdownActions }): React.ReactNode {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'br':
        return <br key={index} />;
      case 'strong':
        return (
          <strong key={index} className='font-semibold text-foreground'>
            <InlineView nodes={node.children} actions={actions} />
          </strong>
        );
      case 'em':
        return (
          <em key={index}>
            <InlineView nodes={node.children} actions={actions} />
          </em>
        );
      case 'del':
        return (
          <del key={index} className='text-muted-foreground'>
            <InlineView nodes={node.children} actions={actions} />
          </del>
        );
      case 'mark':
        return (
          <mark key={index} className='rounded-sm bg-highlight px-0.5 text-foreground'>
            <InlineView nodes={node.children} actions={actions} />
          </mark>
        );
      case 'code':
        return (
          <code key={index} className='rounded bg-muted px-1 py-0.5 font-mono text-[0.82em] text-foreground'>
            {node.text}
          </code>
        );
      case 'link':
        return (
          <a
            key={index}
            href={node.href}
            target='_blank'
            rel='noopener noreferrer nofollow'
            className='text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary'
          >
            <InlineView nodes={node.children} actions={actions} />
          </a>
        );
      case 'image':
        return <NoteImage key={`${index}-${node.fileId}`} fileId={node.fileId} alt={node.alt} />;
      case 'file':
        return (
          <a
            key={index}
            href={filePath(node.fileId, true)}
            className='text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary'
          >
            <Paperclip className='mr-1 inline size-[0.85em] align-[-0.05em]' aria-hidden='true' />
            <InlineView nodes={node.children} actions={actions} />
          </a>
        );
      case 'wikilink': {
        const exists = actions.hasNote?.(node.target) ?? true;
        return (
          <button
            key={index}
            type='button'
            onClick={() => actions.onOpenLink?.(node.target)}
            title={exists ? `Open “${node.target}”` : `Create “${node.target}”`}
            className={cn(
              'cursor-pointer rounded-sm text-left underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              exists
                ? 'text-primary decoration-primary/30 hover:decoration-primary'
                : 'text-muted-foreground decoration-muted-foreground/50 decoration-dashed hover:text-primary'
            )}
          >
            {node.label}
          </button>
        );
      }
      case 'tag':
        return (
          <button
            key={index}
            type='button'
            onClick={() => actions.onTagClick?.(node.tag)}
            title={`Show notes tagged #${node.tag}`}
            className='cursor-pointer rounded-sm font-sans text-[0.82em] font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40'
          >
            {node.text}
          </button>
        );
    }
  });
}

/** An attached image. The file route answers 401/404 when it can't be shown. */
function NoteImage({ fileId, alt }: { fileId: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className='my-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-sans text-[13px] text-muted-foreground'>
        <ImageOff className='size-3.5' aria-hidden='true' />
        {alt || 'Image'} isn’t available
      </span>
    );
  }
  return (
    <img
      src={filePath(fileId)}
      alt={alt}
      loading='lazy'
      onError={() => setFailed(true)}
      className='my-3 block h-auto max-w-full rounded-lg border border-border'
    />
  );
}
