// The block editor for one page. Saves to the workspace store shortly after
// typing stops, and picks up changes that arrive from sync while idle.
import type { Editor, JSONContent } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { registerEditor } from '~/lib/workspace/editors';
import { getPage, updatePage, useWorkspace } from '~/lib/workspace/store';
import { EditorEnvProvider } from './editor-env';
import type { EditorEnv } from './editor-env';
import { editorExtensions } from './extensions';
import { setFileDropEnv } from './extensions/file-drop';
import { BlockHandle } from './menus/BlockHandle';
import { FormatToolbar } from './menus/FormatToolbar';
import { SuggestionMenu } from './menus/SuggestionMenu';
import { TableToolbar } from './menus/TableToolbar';
import { bindMathClicks, MathEditor } from './nodes/math';
import './editor.css';

const SAVE_DELAY = 350;

export function parseContent(content: string): JSONContent | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return null;
  }
}

export type PageEditorProps = {
  env: EditorEnv;
  editable: boolean;
  /** ↑ on the first line moves to the title. */
  onExitTop: () => void;
  onReady?: (editor: Editor | null) => void;
  /** Links inside the app open as pages; others open in a new tab. */
  onOpenLink: (href: string) => void;
};

export function PageEditor({ env, editable, onExitTop, onReady, onOpenLink }: PageEditorProps) {
  const pageId = env.pageId;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const saved = useRef(getPage(pageId)?.content ?? '');
  const timer = useRef<number | undefined>(undefined);
  const callbacks = useRef({ onExitTop, onOpenLink });
  callbacks.current = { onExitTop, onOpenLink };

  const editor = useEditor(
    {
      extensions: editorExtensions(),
      content: parseContent(saved.current),
      editable,
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { class: 'notion-editor', spellcheck: 'true' },
        handleKeyDown(view, event) {
          if (event.key !== 'ArrowUp' || event.shiftKey || event.metaKey || event.altKey) return false;
          const { selection } = view.state;
          if (!selection.empty) return false;
          // Only from the first line of the first block.
          const first = TextSelection.atStart(view.state.doc);
          if (selection.from !== first.from && !(view.endOfTextblock('up') && selection.$from.index(0) === 0)) return false;
          callbacks.current.onExitTop();
          return true;
        },
        handleClick(view, _pos, event) {
          const target = event.target as HTMLElement | null;
          const anchor = target?.closest('a[href]');
          if (!anchor || anchor.closest('[data-type="page-mention"], .notion-mention, .notion-page-block')) return false;
          if (!view.dom.contains(anchor)) return false;
          // A click that made a selection (drag) isn't a link click.
          if (!view.state.selection.empty) return false;
          event.preventDefault();
          callbacks.current.onOpenLink(anchor.getAttribute('href') ?? '');
          return true;
        }
      },
      onCreate: ({ editor: created }) => bindMathClicks(created),
      onUpdate: ({ editor: current }) => {
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => save(current), SAVE_DELAY);
      }
    },
    [pageId]
  );

  function save(current: Editor) {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    if (current.isDestroyed) return;
    const content = JSON.stringify(current.getJSON());
    if (content === saved.current) return;
    saved.current = content;
    updatePage(pageId, { content });
  }

  // Register for flushes (sync, sign-out, unload) and for workspace actions.
  useEffect(() => {
    if (!editor) return;
    onReady?.(editor);
    const flush = () => {
      if (timer.current !== undefined) save(editor);
    };
    const unregister = registerEditor(pageId, { editor, flush });
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      unregister();
      window.removeEventListener('pagehide', flush);
      onReady?.(null);
    };
    // `save` and `onReady` read refs; the editor instance is the dependency.
  }, [editor, pageId]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  // Pasted and dropped files upload to this page.
  const { signedIn, requestSignIn } = env;
  const requestSignInRef = useRef(requestSignIn);
  requestSignInRef.current = requestSignIn;
  useEffect(() => {
    if (!editor) return;
    setFileDropEnv(editor, { pageId, signedIn, requestSignIn: () => requestSignInRef.current() });
    return () => setFileDropEnv(editor, null);
  }, [editor, pageId, signedIn]);

  // Content changed elsewhere (another device, a subpage block appended from
  // the sidebar): load it unless the writer has unsaved typing here.
  const content = useWorkspace((state) => state.pages[pageId]?.content ?? '');
  useEffect(() => {
    if (!editor || editor.isDestroyed || content === saved.current || timer.current !== undefined) return;
    saved.current = content;
    const { from } = editor.state.selection;
    editor.commands.setContent(parseContent(content), { emitUpdate: false });
    const max = editor.state.doc.content.size;
    editor.commands.setTextSelection(Math.min(from, max));
  }, [editor, content]);

  if (!editor) return <div className='notion-editor-placeholder' />;

  return (
    <EditorEnvProvider value={env}>
      <div ref={wrapperRef} className='relative'>
        <EditorContent editor={editor} />
        {editable ? (
          <>
            <BlockHandle editor={editor} wrapperRef={wrapperRef} />
            <FormatToolbar editor={editor} />
            <TableToolbar editor={editor} />
            <SuggestionMenu editor={editor} />
            <MathEditor editor={editor} />
          </>
        ) : null}
      </div>
    </EditorEnvProvider>
  );
}
