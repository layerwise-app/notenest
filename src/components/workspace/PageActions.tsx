// The page actions shared by the sidebar's ⋯ menu and the page's ⋯ menu.
import { useNavigate } from '@tanstack/react-router';
import { ArrowRightLeft, Copy, Link2, PenLine, Star, StarOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenuItem, DropdownMenuShortcut } from '~/components/ui/dropdown-menu';
import type { Page } from '~/lib/pages/page';
import { duplicatePage, restorePage, toggleFavorite, trashPage } from '~/lib/workspace/actions';
import { useUi } from '~/lib/workspace/ui';

export function copyPageLink(page: Page) {
  void navigator.clipboard
    .writeText(`${window.location.origin}/notes/${page.id}`)
    .then(() => toast.success('Copied link to page'))
    .catch(() => toast.error('Couldn’t copy the link.'));
}

/** Moves a page to Trash with an Undo toast; leaves the page if it was open. */
export function useTrashPage() {
  const navigate = useNavigate();
  return (page: Page, isOpen: boolean) => {
    trashPage(page.id);
    toast('Moved to Trash', { action: { label: 'Undo', onClick: () => restorePage(page.id) } });
    if (isOpen) {
      if (page.parentId) void navigate({ to: '/notes/$pageId', params: { pageId: page.parentId } });
      else void navigate({ to: '/notes' });
    }
  };
}

export function PageActionItems({ page, isOpen, onRename }: { page: Page; isOpen: boolean; onRename?: () => void }) {
  const navigate = useNavigate();
  const trash = useTrashPage();
  return (
    <>
      <DropdownMenuItem onSelect={() => toggleFavorite(page.id)}>
        {page.favorite ? <StarOff className='size-4' /> : <Star className='size-4' />}
        {page.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => copyPageLink(page)}>
        <Link2 className='size-4' />
        Copy link
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          const copy = duplicatePage(page.id);
          if (copy) void navigate({ to: '/notes/$pageId', params: { pageId: copy.id } });
        }}
      >
        <Copy className='size-4' />
        Duplicate
      </DropdownMenuItem>
      {onRename ? (
        <DropdownMenuItem onSelect={onRename}>
          <PenLine className='size-4' />
          Rename
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onSelect={() => useUi.setState({ movingPageId: page.id })}>
        <ArrowRightLeft className='size-4' />
        Move to
        <DropdownMenuShortcut>⌘⇧P</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem variant='destructive' onSelect={() => trash(page, isOpen)}>
        <Trash2 className='size-4' />
        Move to Trash
      </DropdownMenuItem>
    </>
  );
}
