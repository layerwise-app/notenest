// One page: top bar, cover/icon/title, and the block editor.
import { useNavigate } from '@tanstack/react-router';
import type { Editor } from '@tiptap/core';
import { FileUp, Undo2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { PageEditor } from '~/components/editor/PageEditor';
import type { EditorEnv } from '~/components/editor/editor-env';
import { useMediaQuery } from '~/hooks/use-media-query';
import { useSession } from '~/lib/auth-client';
import { pageTitle } from '~/lib/pages/page';
import type { Page } from '~/lib/pages/page';
import { createPage, purgePage, restorePage } from '~/lib/workspace/actions';
import { updatePage, useWorkspace } from '~/lib/workspace/store';
import { PAGE_TEMPLATES } from '~/lib/workspace/templates';
import { importMarkdownFiles, pickMarkdownFiles, readMarkdownFile } from '~/lib/workspace/transfer';
import { rememberVisit, useUi } from '~/lib/workspace/ui';
import { cn } from '~/lib/utils';
import { PageHeader } from './PageHeader';
import { PageTopbar } from './PageTopbar';

const isEmptyContent = (content: string) =>
  !content || content === '{"type":"doc","content":[{"type":"paragraph"}]}' || content === '{"type":"doc","content":[]}';

export function PageView({ pageId }: { pageId: string }) {
  const page = useWorkspace((state) => state.pages[pageId]);
  const navigate = useNavigate();

  useEffect(() => {
    if (page && !page.purged) rememberVisit(pageId);
  }, [pageId, page?.purged]);

  useEffect(() => {
    if (page && !page.purged) document.title = `${page.icon ? `${page.icon} ` : ''}${pageTitle(page)} — NoteNest`;
  }, [page?.title, page?.icon, page?.purged]);

  if (!page || page.purged) {
    return (
      <div className='grid flex-1 place-items-center px-6 text-center'>
        <div>
          <p className='text-[15px] font-medium'>This page doesn’t exist</p>
          <p className='mt-1 text-[14px] text-muted-foreground'>It may have been deleted, or it lives in another account.</p>
          <button type='button' className='notion-button mt-4 border border-border' onClick={() => void navigate({ to: '/notes' })}>
            Back to your pages
          </button>
        </div>
      </div>
    );
  }
  return <LoadedPage key={page.id} page={page} />;
}

function LoadedPage({ page }: { page: Page }) {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const wide = useMediaQuery('(min-width: 1024px)');
  const sidebarOpen = useUi((state) => state.sidebarOpen);
  const editorRef = useRef<Editor | null>(null);
  const deleted = page.deletedAt !== null;
  const editable = !deleted && !page.locked;

  const env: EditorEnv = {
    pageId: page.id,
    signedIn: Boolean(session),
    requestSignIn: () =>
      toast('Uploads need an account.', { action: { label: 'Sign in', onClick: () => void navigate({ to: '/sign-in' }) } }),
    openPage: (id) => void navigate({ to: '/notes/$pageId', params: { pageId: id } }),
    createSubpage: (title = '') => createPage({ parentId: page.id, title, linkInParent: false }).id
  };

  function openLink(href: string) {
    if (!href) return;
    const url = new URL(href, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith('/notes')) {
      void navigate({ to: url.pathname });
    } else {
      window.open(url.href, '_blank', 'noopener,noreferrer');
    }
  }

  function focusTitle() {
    const title = document.querySelector<HTMLTextAreaElement>('[data-page-title]');
    title?.focus();
    title?.setSelectionRange(title.value.length, title.value.length);
  }

  function enterBody(rest: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const first = editor.state.doc.firstChild;
    const firstIsEmpty = first?.type.name === 'paragraph' && first.content.size === 0;
    if (rest) {
      editor.chain().insertContentAt(0, { type: 'paragraph', content: [{ type: 'text', text: rest }] }).setTextSelection(1).run();
    } else if (firstIsEmpty) {
      editor.chain().setTextSelection(1).run();
    } else {
      editor.chain().insertContentAt(0, { type: 'paragraph' }).setTextSelection(1).run();
    }
    // Tiptap's focus command waits a frame; focus now so the next keystroke lands here.
    editor.view.focus();
  }

  function applyTemplate(id: (typeof PAGE_TEMPLATES)[number]['id']) {
    const built = PAGE_TEMPLATES.find((template) => template.id === id)!.build(new Date());
    updatePage(page.id, {
      content: JSON.stringify(built.content),
      title: page.title.trim() ? page.title : built.title,
      icon: page.icon ?? built.icon
    });
  }

  return (
    <div className='flex min-w-0 flex-1 flex-col'>
      <PageTopbar
        page={page}
        showNavButton={!wide || !sidebarOpen}
        onOpenNav={() => (wide ? useUi.setState({ sidebarOpen: true }) : useUi.setState({ mobileNavOpen: true }))}
      />
      {deleted ? (
        <div className='flex flex-wrap items-center justify-center gap-3 bg-[#eb5757] px-4 py-2 text-[14px] text-white print:hidden'>
          This page is in Trash.
          <button type='button' className='inline-flex h-7 items-center gap-1 rounded-md border border-white/70 px-2 hover:bg-white/15' onClick={() => restorePage(page.id)}>
            <Undo2 className='size-3.5' /> Restore page
          </button>
          <button
            type='button'
            className='h-7 rounded-md border border-white/70 px-2 hover:bg-white/15'
            onClick={() => {
              if (!window.confirm('Delete this page for good?')) return;
              purgePage(page.id);
              void navigate({ to: '/notes' });
            }}
          >
            Delete from Trash
          </button>
        </div>
      ) : null}
      <div className='min-h-0 flex-1 overflow-y-auto' data-scroll-root>
        <article
          className={cn('notion-page', page.fullWidth && 'is-full-width')}
          data-font={page.font}
          data-small-text={page.smallText || undefined}
          data-page-column
        >
          <PageHeader
            page={page}
            editable={editable}
            signedIn={Boolean(session)}
            onRequestSignIn={env.requestSignIn}
            onTitleEnter={enterBody}
            onTitleDown={() => {
              const editor = editorRef.current;
              if (!editor) return;
              editor.commands.setTextSelection(1);
              editor.view.focus();
            }}
          />
          <div className='notion-page-inner'>
            <PageEditor
              env={env}
              editable={editable}
              onExitTop={focusTitle}
              onOpenLink={openLink}
              onReady={(editor) => {
                editorRef.current = editor;
              }}
            />
            {editable && isEmptyContent(page.content) ? (
              <EmptyPageStart
                onTemplate={applyTemplate}
                onImport={() =>
                  void pickMarkdownFiles().then(async (files) => {
                    if (!files.length) return;
                    // The first file fills this page; any others become subpages.
                    const first = await readMarkdownFile(files[0]);
                    updatePage(page.id, { content: first.content, title: page.title.trim() ? page.title : first.title });
                    if (files.length > 1) await importMarkdownFiles(files.slice(1), page.id);
                  })
                }
              />
            ) : null}
            {/* Clicking below the last block continues writing, like Notion. */}
            <div
              className='h-[30vh] min-h-24 cursor-text print:hidden'
              onClick={() => {
                const editor = editorRef.current;
                if (!editor || !editable) return;
                const last = editor.state.doc.lastChild;
                if (last && !(last.type.name === 'paragraph' && last.content.size === 0)) {
                  editor.chain().insertContentAt(editor.state.doc.content.size, { type: 'paragraph' }).focus('end').run();
                } else {
                  editor.commands.focus('end');
                }
              }}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

function EmptyPageStart({ onTemplate, onImport }: { onTemplate: (id: (typeof PAGE_TEMPLATES)[number]['id']) => void; onImport: () => void }) {
  return (
    <div className='notion-empty-start print:hidden'>
      <p className='mb-1 px-2 text-[14px] text-[var(--faint)]'>Press Enter to start writing, or pick a template</p>
      {PAGE_TEMPLATES.map((template) => (
        <button key={template.id} type='button' className='notion-button w-full justify-start text-[14px] text-muted-foreground' onClick={() => onTemplate(template.id)}>
          <span className='w-5 text-center text-[16px]'>{template.icon}</span>
          {template.name}
        </button>
      ))}
      <button type='button' className='notion-button w-full justify-start text-[14px] text-muted-foreground' onClick={onImport}>
        <FileUp className='mx-0.5 size-4' />
        Import Markdown
      </button>
    </div>
  );
}
