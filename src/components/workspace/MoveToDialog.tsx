// "Move to": pick a new parent for a page (or the top level).
import { FileText, Layers } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog';
import { isLive, pageTitle } from '~/lib/pages/page';
import { ancestors, canNest } from '~/lib/pages/tree';
import { movePage } from '~/lib/workspace/actions';
import { useWorkspace } from '~/lib/workspace/store';
import { useUi } from '~/lib/workspace/ui';

export function MoveToDialog() {
  const movingId = useUi((state) => state.movingPageId);
  const close = () => useUi.setState({ movingPageId: null });
  return (
    <Dialog open={movingId !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent showCloseButton={false} className='top-[20%] translate-y-0 gap-0 p-0 sm:max-w-[440px]'>
        <DialogTitle className='sr-only'>Move page</DialogTitle>
        <DialogDescription className='sr-only'>Choose where this page should live.</DialogDescription>
        {movingId ? <MovePicker pageId={movingId} onDone={close} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function MovePicker({ pageId, onDone }: { pageId: string; onDone: () => void }) {
  const pages = useWorkspace((state) => state.pages);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const terms = query.toLowerCase().trim();
  const targets = [
    ...(!terms || 'top level pages'.includes(terms) ? [{ id: null as string | null, label: 'Top level', icon: null, path: 'Pages' }] : []),
    ...Object.values(pages)
      .filter((page) => isLive(page) && page.id !== pageId && canNest(pages, pageId, page.id))
      .filter((page) => pageTitle(page).toLowerCase().includes(terms))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 50)
      .map((page) => ({
        id: page.id as string | null,
        label: pageTitle(page),
        icon: page.icon,
        path: ancestors(pages, page.id).map((parent) => pageTitle(parent)).join(' / ')
      }))
  ];

  function choose(target: (typeof targets)[number]) {
    if (movePage(pageId, target.id)) toast(`Moved to ${target.label}`);
    onDone();
  }

  return (
    <div className='flex max-h-[420px] flex-col'>
      <input
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIndex((value) => Math.min(value + 1, targets.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setIndex((value) => Math.max(value - 1, 0));
          } else if (event.key === 'Enter' && targets[index]) {
            event.preventDefault();
            choose(targets[index]);
          }
        }}
        placeholder='Move page to…'
        className='h-12 border-b border-border bg-transparent px-4 text-[15px] outline-none'
      />
      <div className='min-h-0 flex-1 overflow-y-auto p-1'>
        {targets.map((target, targetIndex) => (
          <button
            key={target.id ?? 'top'}
            type='button'
            data-active={targetIndex === index}
            onMouseMove={() => setIndex(targetIndex)}
            onClick={() => choose(target)}
            className='notion-menu-item py-1'
          >
            <span className='w-5 text-center'>
              {target.id === null ? <Layers className='mx-auto size-4' /> : target.icon ?? <FileText className='mx-auto size-4 text-muted-foreground' strokeWidth={1.6} />}
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate'>{target.label}</span>
              {target.path && target.id !== null ? <span className='block truncate text-[12px] text-muted-foreground'>{target.path}</span> : null}
            </span>
          </button>
        ))}
        {!targets.length ? <p className='px-3 py-6 text-center text-[13px] text-muted-foreground'>No matching pages</p> : null}
      </div>
    </div>
  );
}
