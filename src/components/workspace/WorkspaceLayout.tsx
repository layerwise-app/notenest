// The /notes shell: loads the local workspace, runs sync while signed in,
// and lays out the sidebar, the open page, and the global dialogs.
import { Outlet, useNavigate, useParams } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet';
import { useMediaQuery } from '~/hooks/use-media-query';
import { useSession } from '~/lib/auth-client';
import { createPage } from '~/lib/workspace/actions';
import { hydrateWorkspace, useWorkspace } from '~/lib/workspace/store';
import { startSync, stopSync } from '~/lib/workspace/sync';
import { openSearch, toggleSidebar, useUi } from '~/lib/workspace/ui';
import { MoveToDialog } from './MoveToDialog';
import { SearchDialog } from './SearchDialog';
import { Sidebar } from './Sidebar';
import './workspace.css';

export function WorkspaceLayout() {
  const hydrated = useWorkspace((state) => state.hydrated);

  useEffect(() => {
    void hydrateWorkspace();
  }, []);

  if (!hydrated) return <WorkspaceSkeleton />;
  return <Workspace />;
}

function Workspace() {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id ?? null;
  const params = useParams({ strict: false }) as { pageId?: string };
  const activeId = params.pageId ?? null;
  const wide = useMediaQuery('(min-width: 1024px)');
  const sidebarOpen = useUi((state) => state.sidebarOpen);
  const sidebarWidth = useUi((state) => state.sidebarWidth);
  const mobileNavOpen = useUi((state) => state.mobileNavOpen);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    if (isPending) return;
    if (userId) void startSync(userId);
    else stopSync();
  }, [isPending, userId]);

  // Re-registered each render so shortcuts see the current page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if ((key === 'k' || key === 'p') && !event.shiftKey && !event.altKey) {
        // ⌘K with text selected in the editor is "link" (handled there).
        if (key === 'k' && event.defaultPrevented) return;
        event.preventDefault();
        openSearch();
      } else if (event.altKey && event.code === 'KeyN') {
        event.preventDefault();
        void navigate({ to: '/notes/$pageId', params: { pageId: createPage().id } });
      } else if (event.key === '\\') {
        event.preventDefault();
        if (wide) toggleSidebar();
        else useUi.setState((state) => ({ mobileNavOpen: !state.mobileNavOpen }));
      } else if (event.shiftKey && key === 'p' && activeId) {
        event.preventDefault();
        useUi.setState({ movingPageId: activeId });
      } else if (event.shiftKey && key === 'l') {
        event.preventDefault();
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className='notion-app flex h-dvh overflow-hidden bg-background text-foreground'>
      {wide && sidebarOpen ? (
        <aside className='relative shrink-0 print:hidden' style={{ width: sidebarWidth }}>
          <Sidebar activeId={activeId} />
        </aside>
      ) : null}
      <main className='flex min-w-0 flex-1'>
        <Outlet />
      </main>
      {!wide ? (
        <Sheet open={mobileNavOpen} onOpenChange={(open) => useUi.setState({ mobileNavOpen: open })}>
          <SheetContent
            side='left'
            showCloseButton={false}
            className='gap-0 border-sidebar-border p-0 outline-none data-[side=left]:w-[300px]'
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (event.currentTarget as HTMLElement).focus();
            }}
          >
            <SheetTitle className='sr-only'>Pages</SheetTitle>
            <SheetDescription className='sr-only'>Your pages, favorites, templates, and Trash.</SheetDescription>
            <Sidebar activeId={activeId} onNavigate={() => useUi.setState({ mobileNavOpen: false })} />
          </SheetContent>
        </Sheet>
      ) : null}
      <SearchDialog />
      <MoveToDialog />
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className='flex h-dvh bg-background'>
      <div className='w-[248px] shrink-0 bg-sidebar max-lg:hidden' />
      <div className='mx-auto w-full max-w-[708px] px-6 pt-32'>
        <div className='h-10 w-2/3 animate-pulse rounded-md bg-[var(--hover)]' />
        <div className='mt-6 h-4 w-full animate-pulse rounded bg-[var(--hover)]' />
        <div className='mt-3 h-4 w-5/6 animate-pulse rounded bg-[var(--hover)]' />
      </div>
    </div>
  );
}
