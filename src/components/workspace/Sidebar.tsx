import { Link, useNavigate } from '@tanstack/react-router';
import {
  ChevronsLeft,
  ChevronsUpDown,
  Cloud,
  CloudOff,
  FileUp,
  LayoutTemplate,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Search,
  SquarePen,
  Sun,
  Trash2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { NoteNestMark } from '~/components/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { signOut, useSession } from '~/lib/auth-client';
import { isLive } from '~/lib/pages/page';
import { ancestors, childrenIndex } from '~/lib/pages/tree';
import { createPage } from '~/lib/workspace/actions';
import { useWorkspace } from '~/lib/workspace/store';
import { prepareSignOut } from '~/lib/workspace/sync';
import { PAGE_TEMPLATES } from '~/lib/workspace/templates';
import { importMarkdownFiles, pickMarkdownFiles } from '~/lib/workspace/transfer';
import { openSearch, setExpanded, SIDEBAR_MAX, SIDEBAR_MIN, toggleSidebar, useUi } from '~/lib/workspace/ui';
import { cn } from '~/lib/utils';
import { PageTree } from './PageTree';
import { TrashPanel } from './TrashPanel';

export function Sidebar({ activeId, onNavigate, className }: { activeId: string | null; onNavigate?: () => void; className?: string }) {
  const navigate = useNavigate();
  const pages = useWorkspace((state) => state.pages);
  const index = childrenIndex(pages);
  const favorites = Object.values(pages)
    .filter((page) => page.favorite && isLive(page))
    .sort((a, b) => a.title.localeCompare(b.title));
  const [trashOpen, setTrashOpen] = useState(false);
  const trashCount = Object.values(pages).filter((page) => page.deletedAt !== null && !page.purged).length;

  // Reveal the open page in the tree by expanding its parents.
  const parentIds = activeId ? ancestors(pages, activeId).map((page) => page.id).join(',') : '';
  useEffect(() => {
    for (const id of parentIds.split(',').filter(Boolean)) setExpanded(id, true);
  }, [parentIds]);

  const open = (id: string) => {
    onNavigate?.();
    void navigate({ to: '/notes/$pageId', params: { pageId: id } });
  };
  const newPage = (init: Parameters<typeof createPage>[0] = {}) => open(createPage(init).id);

  return (
    <div className={cn('notion-sidebar flex h-full flex-col', className)}>
      <div className='flex items-center gap-1 px-2 pt-2 pb-1'>
        <WorkspaceMenu />
        <button type='button' className='notion-icon-button max-lg:hidden' onClick={toggleSidebar} title='Close sidebar · ⌘\' aria-label='Close sidebar'>
          <ChevronsLeft className='size-4' />
        </button>
        <button type='button' className='notion-icon-button' onClick={() => newPage()} title='New page · ⌥⌘N' aria-label='New page'>
          <SquarePen className='size-4' />
        </button>
      </div>

      <div className='px-2 pb-2'>
        <SidebarItem icon={<Search className='size-4' />} label='Search' hint='⌘K' onClick={() => { onNavigate?.(); openSearch(); }} />
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto px-2 pb-3'>
        {favorites.length ? (
          <section className='mb-3'>
            <h3 className='notion-sidebar-heading'>Favorites</h3>
            <PageTree roots={favorites} index={index} activeId={activeId} onOpen={open} rootKey='favorites' />
          </section>
        ) : null}
        <section className='mb-3'>
          <div className='group/heading flex items-center'>
            <h3 className='notion-sidebar-heading flex-1'>Pages</h3>
            <button
              type='button'
              className='notion-sidebar-action opacity-0 group-hover/heading:opacity-100'
              onClick={() => newPage()}
              aria-label='Add a page'
              title='Add a page'
            >
              <Plus className='size-4' />
            </button>
          </div>
          <PageTree
            roots={index.get('') ?? []}
            index={index}
            activeId={activeId}
            onOpen={open}
            rootKey='pages'
          />
          <SidebarItem icon={<Plus className='size-4' />} label='Add a page' muted onClick={() => newPage()} />
        </section>

        <section className='space-y-px'>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarItem icon={<LayoutTemplate className='size-4' />} label='Templates' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' side='right' className='w-64'>
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>New page from a template</DropdownMenuLabel>
              {PAGE_TEMPLATES.map((template) => (
                <DropdownMenuItem
                  key={template.id}
                  onSelect={() => {
                    const built = template.build(new Date());
                    newPage({ title: built.title, icon: built.icon, content: JSON.stringify(built.content) });
                  }}
                >
                  <span className='w-5 text-center text-[16px]'>{template.icon}</span>
                  <span className='flex flex-col'>
                    <span>{template.name}</span>
                    <span className='text-[12px] text-muted-foreground'>{template.description}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <SidebarItem
            icon={<FileUp className='size-4' />}
            label='Import'
            onClick={() =>
              void pickMarkdownFiles()
                .then((files) => (files.length ? importMarkdownFiles(files) : null))
                .then((page) => page && open(page.id))
            }
          />
          <Popover open={trashOpen} onOpenChange={setTrashOpen}>
            <PopoverTrigger asChild>
              <SidebarItem icon={<Trash2 className='size-4' />} label='Trash' hint={trashCount ? String(trashCount) : undefined} />
            </PopoverTrigger>
            <PopoverContent side='right' align='end' className='w-[400px] max-w-[calc(100vw-24px)] p-0'>
              <TrashPanel
                onOpen={(id) => {
                  setTrashOpen(false);
                  open(id);
                }}
              />
            </PopoverContent>
          </Popover>
        </section>
      </div>

      <SyncFooter />
      <ResizeHandle />
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  hint,
  muted,
  onClick,
  ...rest
}: { icon: ReactNode; label: string; hint?: string; muted?: boolean; onClick?: () => void } & React.ComponentProps<'button'>) {
  return (
    <button type='button' {...rest} onClick={onClick} className={cn('notion-sidebar-row w-full', muted && 'text-[var(--faint)]')}>
      <span className='notion-sidebar-icon'>{icon}</span>
      <span className='flex-1 truncate text-left'>{label}</span>
      {hint ? <span className='text-[12px] text-[var(--faint)]'>{hint}</span> : null}
    </button>
  );
}

function WorkspaceMenu() {
  const { data: session } = useSession();
  const { theme = 'light', setTheme } = useTheme();
  const navigate = useNavigate();
  const user = session?.user ?? null;
  const name = user ? `${user.name || user.email.split('@')[0]}’s NoteNest` : 'NoteNest';

  async function onSignOut() {
    try {
      await prepareSignOut();
      await signOut();
      void navigate({ to: '/notes' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t sign out.');
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className='notion-button min-w-0 flex-1 justify-start px-1.5 font-medium'>
        <NoteNestMark className='size-5 rounded-[5px]' />
        <span className='truncate text-[14px] text-foreground'>{name}</span>
        <ChevronsUpDown className='size-3.5 shrink-0 opacity-50' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-64'>
        {user ? (
          <DropdownMenuLabel className='text-[12px] font-normal text-muted-foreground'>{user.email}</DropdownMenuLabel>
        ) : (
          <DropdownMenuLabel className='text-[12px] font-normal text-muted-foreground'>Saved in this browser</DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value='light'>
            <Sun className='size-4' /> Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value='dark'>
            <Moon className='size-4' /> Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value='system'>
            <Monitor className='size-4' /> Use system setting
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem onSelect={() => void onSignOut()}>
            <LogOut className='size-4' /> Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to='/sign-in'>
              <LogIn className='size-4' /> Sign in to sync
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SyncFooter() {
  const { data: session, isPending } = useSession();
  const status = useWorkspace((state) => state.syncStatus);
  const storageError = useWorkspace((state) => state.storageError);
  if (isPending) return null;
  if (!session) {
    return (
      <div className='border-t border-sidebar-border p-2'>
        <Link to='/sign-in' className='notion-sidebar-row w-full'>
          <span className='notion-sidebar-icon'><CloudOff className='size-4' /></span>
          <span className='flex-1 truncate'>{storageError ? 'Not saved: browser storage is off' : 'Sign in to sync'}</span>
        </Link>
      </div>
    );
  }
  const label =
    status === 'error' ? 'Offline · changes saved here' : status === 'syncing' || status === 'loading' ? 'Syncing…' : 'Synced';
  return (
    <div className='flex items-center gap-2 border-t border-sidebar-border px-4 py-2 text-[12px] text-[var(--faint)]'>
      {status === 'error' ? <CloudOff className='size-3.5' /> : <Cloud className='size-3.5' />}
      {label}
    </div>
  );
}

function ResizeHandle() {
  function onPointerDown(event: React.PointerEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = useUi.getState().sidebarWidth;
    const onMove = (move: PointerEvent) => {
      const width = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + move.clientX - startX));
      useUi.setState({ sidebarWidth: width });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
    };
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  return (
    <div
      className='notion-sidebar-resize max-lg:hidden'
      onPointerDown={onPointerDown}
      onDoubleClick={() => useUi.setState({ sidebarWidth: 248 })}
      role='separator'
      aria-orientation='vertical'
      aria-label='Resize sidebar'
    />
  );
}
