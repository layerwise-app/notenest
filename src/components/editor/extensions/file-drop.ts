// Pasting or dropping files uploads them into image, video, audio, or file
// blocks at the caret or drop point; each block shows its own progress.
// The page view tells the editor which page it is and whether someone is
// signed in: `setFileDropEnv(editor, { pageId, signedIn, requestSignIn })`.
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { dropPoint } from '@tiptap/pm/transform';
import { toast } from 'sonner';
import { MAX_ATTACHMENT_BYTES, mediaKindFor } from '~/lib/note-files';
import type { EditorEnv } from '../editor-env';
import { startUpload } from '../media/upload-store';

export type FileDropEnv = Pick<EditorEnv, 'pageId' | 'signedIn' | 'requestSignIn'>;

type FileDropStorage = { env: FileDropEnv | null };

declare module '@tiptap/core' {
  interface Storage {
    fileDrop: FileDropStorage;
  }
}

/** Call whenever the page, or the signed-in state, changes. */
export function setFileDropEnv(editor: Editor, env: FileDropEnv | null) {
  editor.storage.fileDrop.env = env;
}

const BLOCK_FOR = { image: 'image', video: 'video', audio: 'audio', file: 'fileBlock' } as const;
const MEDIA_BLOCKS = new Set<string>(Object.values(BLOCK_FOR));

const blockTypeFor = (file: File) => BLOCK_FOR[mediaKindFor(file.type || 'application/octet-stream')];

/** Clipboard HTML that is just an image ("Copy image" in a browser), not rich text. */
function isOnlyImages(html: string) {
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  return !body.textContent?.trim() && body.querySelector('img') !== null;
}

export const FileDrop = Extension.create<Record<string, never>, FileDropStorage>({
  name: 'fileDrop',

  addStorage() {
    return { env: null };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    /** Checks sign-in and sizes, then uploads the files into blocks. */
    const upload = (view: EditorView, dropped: File[], at: { pos: number; inside: number } | null) => {
      const env = editor.storage.fileDrop.env;
      if (!env) {
        toast.error('Files can’t be uploaded here.');
        return;
      }
      if (!env.signedIn) {
        toast('Sign in to upload files.', { action: { label: 'Sign in', onClick: env.requestSignIn } });
        return;
      }
      const files = dropped.filter((file) => file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES);
      if (dropped.some((file) => file.size > MAX_ATTACHMENT_BYTES)) toast.error('Files can be up to 5 GB.');
      else if (files.length < dropped.length) toast.error('Empty files can’t be uploaded.');
      if (!files.length) return;
      const { schema } = view.state;
      // Dropping one file on an empty block of the right kind fills that block.
      const inside = at?.inside ?? -1;
      const target = inside >= 0 ? view.state.doc.nodeAt(inside) : null;
      if (files.length === 1 && target && isEmptyMedia(target) && target.type.name === blockTypeFor(files[0])) {
        const uploadId = startUpload(editor, files[0], env.pageId);
        view.dispatch(view.state.tr.setNodeMarkup(inside, undefined, { ...target.attrs, uploadId, name: files[0].name }));
        return;
      }
      const nodes = files.map((file) =>
        schema.nodes[blockTypeFor(file)].create({ uploadId: startUpload(editor, file, env.pageId), name: file.name })
      );
      insertBlocksAt(view, nodes, at?.pos ?? null);
    };

    return [
      new Plugin({
        key: new PluginKey('fileDrop'),
        props: {
          handlePaste(view, event) {
            const data = event.clipboardData;
            const files = Array.from(data?.files ?? []);
            if (!data || !files.length) return false;
            // Rich text from Word, Pages, etc. also carries a picture of itself.
            const html = data.getData('text/html');
            if (html && !isOnlyImages(html)) return false;
            upload(view, files, null);
            return true;
          },
          handleDrop(view, event, _slice, moved) {
            // Moving blocks inside the editor is ProseMirror's job.
            if (moved || view.dragging) return false;
            const files = Array.from(event.dataTransfer?.files ?? []);
            if (!files.length) return false;
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            upload(view, files, at);
            return true;
          }
        }
      })
    ];
  }
});

function isEmptyMedia(node: PMNode) {
  return MEDIA_BLOCKS.has(node.type.name) && !node.attrs.src && !node.attrs.uploadId;
}

/**
 * Inserts blocks Notion-style: an empty text block gives way to them,
 * otherwise they go after the block at `pos` (the caret's block when null).
 * The caret ends up in the text block after them.
 */
function insertBlocksAt(view: EditorView, nodes: PMNode[], pos: number | null) {
  const { state } = view;
  const fragment = Fragment.from(nodes);
  const tr = state.tr;
  const $pos = pos === null ? state.selection.$to : state.doc.resolve(pos);
  let start: number;

  const parentAllows = $pos.depth > 0 && $pos.node(-1).canReplace($pos.index(-1), $pos.index(-1) + 1, fragment);
  if ($pos.parent.isTextblock && $pos.parent.content.size === 0 && parentAllows) {
    start = $pos.before();
    tr.replaceWith(start, $pos.after(), fragment);
  } else {
    // At the caret, place after its block; at a drop point, before or after by half.
    const from = pos === null && $pos.parent.isTextblock ? $pos.end() : $pos.pos;
    start = dropPoint(state.doc, from, new Slice(fragment, 0, 0)) ?? state.doc.content.size;
    tr.insert(start, fragment);
  }

  const end = start + fragment.size;
  const $end = tr.doc.resolve(end);
  if (!$end.nodeAfter?.isTextblock) {
    const paragraph = state.schema.nodes.paragraph;
    if ($end.parent.canReplaceWith($end.index(), $end.index(), paragraph)) tr.insert(end, paragraph.create());
  }
  if (tr.doc.resolve(end).nodeAfter?.isTextblock) tr.setSelection(TextSelection.create(tr.doc, end + 1));
  view.dispatch(tr.scrollIntoView());
  view.focus();
}
