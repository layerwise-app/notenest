// The bar above a page: breadcrumbs, last edit, favorite, and the page menu.
import { Link } from '@tanstack/react-router';
import { formatDistanceToNowStrict } from 'date-fns';
import { ChevronsRight, FileDown, FileText, FileUp, Lock, Menu, MoreHorizontal, Printer, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Switch } from '~/components/ui/switch';
import { pageTitle } from '~/lib/pages/page';
import type { Page, PageFont } from '~/lib/pages/page';
import { ancestors } from '~/lib/pages/tree';
import { toggleFavorite } from '~/lib/workspace/actions';
import { updatePage, useWorkspace } from '~/lib/workspace/store';
import { copyPageMarkdown, downloadPageMarkdown, importMarkdownFiles, pickMarkdownFiles, wordCount } from '~/lib/workspace/transfer';
import { useUi } from '~/lib/workspace/ui';
import { cn } from '~/lib/utils';
import { PageActionItems } from './PageActions';

const FONTS: { id: PageFont; label: string; className: string }[] = [
  { id: 'sans', label: 'Default', className: 'font-sans' },
  { id: 'serif', label: 'Serif', className: 'font-serif' },
  { id: 'mono', label: 'Mono', className: 'font-mono' }
];

export function PageTopbar({ page, onOpenNav, showNavButton }: { page: Page; onOpenNav: () => void; showNavButton: boolean }) {
  const pages = useWorkspace((state) => state.pages);
  const sidebarOpen = useUi((state) => state.sidebarOpen);
  const trail = ancestors(pages, page.id);
  const deleted = page.deletedAt !== null;
  // Long chains collapse to the first parent, "…", and the last two, like Notion.
  const shown = trail.length > 3 ? [trail[0], null, ...trail.slice(-2)] : trail;

  return (
    <header className='notion-topbar print:hidden'>
      {showNavButton ? (
        <button type='button' className='notion-icon-button shrink-0' onClick={onOpenNav} aria-label='Open sidebar' title='Open sidebar · ⌘\'>
          {sidebarOpen ? <Menu className='size-4' /> : <ChevronsRight className='size-4' />}
        </button>
      ) : null}
      <nav className='flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[14px]' aria-label='Breadcrumb'>
        {shown.map((item, index) =>
          item ? (
            <span key={item.id} className='flex min-w-0 items-center gap-0.5'>
              <Crumb page={item} />
              <span className='text-[var(--faint)]'>/</span>
            </span>
          ) : (
            <span key={`gap-${index}`} className='flex items-center gap-0.5 text-[var(--faint)]'>
              <span className='px-1'>…</span>/
            </span>
          )
        )}
        <Crumb page={page} current />
        {page.locked ? <Lock className='ml-1 size-3.5 shrink-0 text-[var(--faint)]' aria-label='Locked' /> : null}
      </nav>
      <span className='shrink-0 text-[13px] text-[var(--faint)] max-sm:hidden'>
        Edited {formatDistanceToNowStrict(page.updatedAt, { addSuffix: true })}
      </span>
      {!deleted ? (
        <>
          <button
            type='button'
            className={cn('notion-icon-button shrink-0', page.favorite && 'text-[#f5c242] hover:text-[#f5c242]')}
            onClick={() => toggleFavorite(page.id)}
            aria-label={page.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
            title={page.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            <Star className='size-4' fill={page.favorite ? 'currentColor' : 'none'} />
          </button>
          <PageMenu page={page} />
        </>
      ) : null}
    </header>
  );
}

function Crumb({ page, current }: { page: Page; current?: boolean }) {
  return (
    <Link
      to='/notes/$pageId'
      params={{ pageId: page.id }}
      className={cn('notion-button h-6 min-w-0 gap-1.5 px-1.5', current ? 'shrink' : 'max-w-[160px] shrink-[2]')}
    >
      <span className='shrink-0'>{page.icon ?? <FileText className='size-3.5' strokeWidth={1.75} />}</span>
      <span className='truncate'>{pageTitle(page)}</span>
    </Link>
  );
}

function PageMenu({ page }: { page: Page }) {
  const words = wordCount(page.content);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className='notion-icon-button shrink-0' aria-label='Page options'>
        <MoreHorizontal className='size-4' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <div className='grid grid-cols-3 gap-1 p-1'>
          {FONTS.map((font) => (
            <button
              key={font.id}
              type='button'
              onClick={() => updatePage(page.id, { font: font.id })}
              className={cn('flex flex-col items-center gap-0.5 rounded-md py-1.5 hover:bg-[var(--hover)]', page.font === font.id && 'text-primary')}
            >
              <span className={cn('text-[22px] leading-tight', font.className)}>Ag</span>
              <span className='text-[12px] text-muted-foreground'>{font.label}</span>
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <ToggleItem label='Small text' checked={page.smallText} onChange={(smallText) => updatePage(page.id, { smallText })} />
        <ToggleItem label='Full width' checked={page.fullWidth} onChange={(fullWidth) => updatePage(page.id, { fullWidth })} />
        <ToggleItem label='Lock page' checked={page.locked} onChange={(locked) => updatePage(page.id, { locked })} />
        <DropdownMenuSeparator />
        <PageActionItems page={page} isOpen />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            void pickMarkdownFiles().then((files) => (files.length ? importMarkdownFiles(files, page.id) : null))
          }
        >
          <FileUp className='size-4' />
          Import Markdown here
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void downloadPageMarkdown(page)}>
          <FileDown className='size-4' />
          Export as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copyPageMarkdown(page)}>
          <FileText className='size-4' />
          Copy as Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.setTimeout(() => window.print(), 50)}>
          <Printer className='size-4' />
          Print or save as PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className='px-2 py-1.5 text-[12px] leading-relaxed text-muted-foreground'>
          <div>Word count: {words.toLocaleString()}</div>
          <div>Edited {new Date(page.updatedAt).toLocaleString()}</div>
          <div>Created {new Date(page.createdAt).toLocaleDateString()}</div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToggleItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        onChange(!checked);
      }}
    >
      <span className='flex-1'>{label}</span>
      <Switch checked={checked} tabIndex={-1} className='pointer-events-none scale-90' />
    </DropdownMenuItem>
  );
}
