// ⌘K search: recent pages, title and full-text matches, and quick actions.
import { useNavigate } from '@tanstack/react-router';
import { Command } from 'cmdk';
import { CornerDownLeft, FileText, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { isLive, pageTitle } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { ancestors } from '~/lib/pages/tree';
import { createPage } from '~/lib/workspace/actions';
import { useWorkspace } from '~/lib/workspace/store';
import { pagePlainText } from '~/lib/workspace/transfer';
import { useUi } from '~/lib/workspace/ui';

export function SearchDialog() {
  const open = useUi((state) => state.searchOpen);
  const setOpen = (value: boolean) => useUi.setState({ searchOpen: value });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className='top-[12%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[620px]'>
        <DialogTitle className='sr-only'>Search</DialogTitle>
        <DialogDescription className='sr-only'>Search pages by title or content.</DialogDescription>
        {open ? <SearchPanel onClose={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

type Result = { page: Page; snippet: string | null; path: string };

function snippetAround(text: string, term: string) {
  const at = text.toLowerCase().indexOf(term);
  if (at < 0) return null;
  const start = Math.max(0, at - 40);
  return `${start > 0 ? '…' : ''}${text.slice(start, at + term.length + 80)}`;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const pages = useWorkspace((state) => state.pages);
  const recent = useUi((state) => state.recent);
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const live = Object.values(pages).filter(isLive);
  const pathOf = (page: Page) => ancestors(pages, page.id).map((parent) => pageTitle(parent)).join(' / ');

  let results: Result[];
  if (!terms.length) {
    const byId = new Map(live.map((page) => [page.id, page]));
    const recentPages = recent.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const rest = live.filter((page) => !recent.includes(page.id)).sort((a, b) => b.updatedAt - a.updatedAt);
    results = [...recentPages, ...rest].slice(0, 12).map((page) => ({ page, snippet: null, path: pathOf(page) }));
  } else {
    const scored = live.flatMap((page) => {
      const title = pageTitle(page).toLowerCase();
      const body = pagePlainText(page.content);
      const haystack = `${title} ${body.toLowerCase()}`;
      if (!terms.every((term) => haystack.includes(term))) return [];
      const titleHits = terms.filter((term) => title.includes(term)).length;
      const snippet = titleHits === terms.length ? null : snippetAround(body, terms.find((term) => !title.includes(term)) ?? terms[0]);
      return [{ page, snippet, path: pathOf(page), score: (title.startsWith(terms[0]) ? 10 : 0) + titleHits * 3 }];
    });
    results = scored.sort((a, b) => b.score - a.score || b.page.updatedAt - a.page.updatedAt).slice(0, 30);
  }

  function go(id: string) {
    onClose();
    void navigate({ to: '/notes/$pageId', params: { pageId: id } });
  }

  return (
    <Command shouldFilter={false} loop className='flex max-h-[min(520px,70vh)] flex-col'>
      <div className='flex items-center gap-2 border-b border-border px-4'>
        <Search className='size-4 shrink-0 text-muted-foreground' />
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder='Search pages…'
          className='h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--faint)]'
        />
      </div>
      <Command.List className='min-h-0 flex-1 overflow-y-auto p-1.5'>
        <Command.Group heading={terms.length ? 'Best matches' : 'Recent'} className='notion-command-group'>
          {results.map(({ page, snippet, path }) => (
            <Command.Item key={page.id} value={page.id} onSelect={() => go(page.id)} className='notion-command-item'>
              <span className='w-5 shrink-0 text-center text-[16px]'>
                {page.icon ?? <FileText className='mx-auto size-4 text-muted-foreground' strokeWidth={1.6} />}
              </span>
              <span className='min-w-0 flex-1'>
                <span className='flex items-baseline gap-2'>
                  <span className='truncate'>{pageTitle(page)}</span>
                  {path ? <span className='truncate text-[12px] text-[var(--faint)]'>{path}</span> : null}
                </span>
                {snippet ? <span className='block truncate text-[12px] text-muted-foreground'>{snippet}</span> : null}
              </span>
              <CornerDownLeft className='notion-command-enter size-3.5 text-muted-foreground' />
            </Command.Item>
          ))}
        </Command.Group>
        {terms.length ? (
          <Command.Group heading='Actions' className='notion-command-group'>
            <Command.Item
              value='__create'
              onSelect={() => go(createPage({ title: query.trim() }).id)}
              className='notion-command-item'
            >
              <Plus className='size-4 text-muted-foreground' />
              <span className='truncate'>
                New page “<span className='font-medium'>{query.trim()}</span>”
              </span>
            </Command.Item>
          </Command.Group>
        ) : null}
        {!results.length && !terms.length ? (
          <p className='px-3 py-8 text-center text-[13px] text-muted-foreground'>No pages yet</p>
        ) : null}
      </Command.List>
      <div className='flex items-center gap-4 border-t border-border px-4 py-2 text-[12px] text-[var(--faint)]'>
        <span>↑↓ Select</span>
        <span>↵ Open</span>
        <span>esc Close</span>
      </div>
    </Command>
  );
}
