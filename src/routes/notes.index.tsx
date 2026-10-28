import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { FileUp, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { NoteNestMark } from '~/components/brand';
import { isLive } from '~/lib/pages/page';
import { childrenIndex } from '~/lib/pages/tree';
import { createPage } from '~/lib/workspace/actions';
import { useWorkspace } from '~/lib/workspace/store';
import { PAGE_TEMPLATES, welcomePage } from '~/lib/workspace/templates';
import { importMarkdownFiles, pickMarkdownFiles } from '~/lib/workspace/transfer';
import { useUi } from '~/lib/workspace/ui';

export const Route = createFileRoute('/notes/')({
  component: NotesHome
});

/** Opens the last page you visited, or offers a first page when there are none. */
function NotesHome() {
  const navigate = useNavigate();
  const pages = useWorkspace((state) => state.pages);
  const recent = useUi((state) => state.recent);
  const target = recent.find((id) => pages[id] && isLive(pages[id])) ?? childrenIndex(pages).get('')?.[0]?.id ?? null;

  useEffect(() => {
    if (target) void navigate({ to: '/notes/$pageId', params: { pageId: target }, replace: true });
  }, [target, navigate]);

  if (target) return null;

  const open = (id: string) => void navigate({ to: '/notes/$pageId', params: { pageId: id } });
  const fromJson = (built: { title: string; icon: string; content: object }) =>
    open(createPage({ title: built.title, icon: built.icon, content: JSON.stringify(built.content) }).id);

  return (
    <div className='flex flex-1 flex-col'>
      <header className='notion-topbar lg:hidden'>
        <button type='button' className='notion-button' onClick={() => useUi.setState({ mobileNavOpen: true })}>
          Pages
        </button>
      </header>
      <div className='grid flex-1 place-items-center px-6'>
        <div className='w-full max-w-[420px] text-center'>
          <NoteNestMark className='mx-auto size-10 rounded-[10px]' />
          <h1 className='mt-5 text-[22px] font-semibold'>Your workspace is empty</h1>
          <p className='mt-1.5 text-[14px] text-muted-foreground'>Start a page, take the tour, or bring in Markdown.</p>
          <div className='mt-6 flex flex-col gap-1 text-left'>
            <button type='button' className='notion-menu-item h-9' onClick={() => open(createPage().id)}>
              <Plus className='size-4' /> New page
            </button>
            <button type='button' className='notion-menu-item h-9' onClick={() => fromJson(welcomePage())}>
              <span className='w-4 text-center'>👋</span> Getting started tour
            </button>
            {PAGE_TEMPLATES.map((template) => (
              <button key={template.id} type='button' className='notion-menu-item h-9' onClick={() => fromJson(template.build(new Date()))}>
                <span className='w-4 text-center'>{template.icon}</span> {template.name}
              </button>
            ))}
            <button
              type='button'
              className='notion-menu-item h-9'
              onClick={() =>
                void pickMarkdownFiles()
                  .then((files) => (files.length ? importMarkdownFiles(files) : null))
                  .then((page) => page && open(page.id))
              }
            >
              <FileUp className='size-4' /> Import Markdown
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
