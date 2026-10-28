// Trash: search deleted pages, restore them, or delete them for good.
import { FileText, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { pageTitle } from '~/lib/pages/page';
import { ancestors } from '~/lib/pages/tree';
import { emptyTrash, purgePage, restorePage } from '~/lib/workspace/actions';
import { useWorkspace } from '~/lib/workspace/store';

export function TrashPanel({ onOpen }: { onOpen: (id: string) => void }) {
  const pages = useWorkspace((state) => state.pages);
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const terms = query.toLowerCase().trim();
  const deleted = Object.values(pages)
    .filter((page) => page.deletedAt !== null && !page.purged)
    // Show each deleted tree once, by its top page.
    .filter((page) => !page.parentId || pages[page.parentId]?.deletedAt !== page.deletedAt || terms)
    .filter((page) => pageTitle(page).toLowerCase().includes(terms))
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));

  return (
    <div className='flex max-h-[460px] flex-col'>
      <div className='border-b border-border p-2'>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Search pages in Trash'
          className='notion-input w-full'
        />
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto p-1'>
        {deleted.length ? (
          deleted.map((page) => {
            const path = ancestors(pages, page.id).map((parent) => pageTitle(parent)).join(' / ');
            return (
              <div key={page.id} className='group flex items-center gap-1 rounded-md pr-1 hover:bg-[var(--hover)]'>
                <button type='button' onClick={() => onOpen(page.id)} className='flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left'>
                  <span className='w-5 shrink-0 text-center'>{page.icon ?? <FileText className='mx-auto size-4 text-muted-foreground' strokeWidth={1.6} />}</span>
                  <span className='min-w-0'>
                    <span className='block truncate text-[14px]'>{pageTitle(page)}</span>
                    {path ? <span className='block truncate text-[12px] text-muted-foreground'>{path}</span> : null}
                  </span>
                </button>
                <button type='button' className='notion-icon-button' title='Restore' aria-label='Restore' onClick={() => restorePage(page.id)}>
                  <Undo2 className='size-4' />
                </button>
                {confirming === page.id ? (
                  <button
                    type='button'
                    className='h-7 rounded-md px-2 text-[12px] font-medium text-destructive hover:bg-destructive/10'
                    onClick={() => {
                      purgePage(page.id);
                      setConfirming(null);
                    }}
                  >
                    Delete forever
                  </button>
                ) : (
                  <button type='button' className='notion-icon-button' title='Delete from Trash' aria-label='Delete from Trash' onClick={() => setConfirming(page.id)}>
                    <Trash2 className='size-4' />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className='px-3 py-8 text-center text-[13px] text-muted-foreground'>{terms ? 'No matches' : 'Trash is empty'}</p>
        )}
      </div>
      {deleted.length && !terms ? (
        <div className='flex items-center justify-between border-t border-border px-3 py-2 text-[12px] text-muted-foreground'>
          <span>Pages in Trash stay until you delete them.</span>
          <button
            type='button'
            className='rounded px-1.5 py-0.5 hover:bg-[var(--hover)] hover:text-destructive'
            onClick={() => {
              if (window.confirm('Delete every page in Trash for good?')) emptyTrash();
            }}
          >
            Empty Trash
          </button>
        </div>
      ) : null}
    </div>
  );
}
