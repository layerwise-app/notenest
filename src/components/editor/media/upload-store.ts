// In-flight uploads, kept outside React and keyed by the `uploadId` a block
// carries. Progress survives a block's node view remounting, and a finished
// upload still lands in the block after undo/redo or reopening the page.
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { useEffect, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { filePath, isPreviewableImage } from '~/lib/note-files';
import type { AttachedFile } from '~/lib/note-files';
import { uploadFile } from '~/lib/uploads';

export type UploadState = {
  name: string;
  /** 0–1. */
  progress: number;
  /** A local preview of an image while it uploads. */
  previewUrl: string | null;
  /** Set once the upload finished. */
  file: AttachedFile | null;
};

// Finished uploads stay for the session so a block that reappears (redo,
// another editor on the same page) still gets its file.
const uploads = new Map<string, UploadState>();
const listeners = new Set<() => void>();

function setUpload(id: string, state: UploadState | null) {
  if (state) uploads.set(id, state);
  else uploads.delete(id);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Starts uploading `file`; put the returned ID on the block(s) showing it. */
export function startUpload(editor: Editor, file: File, pageId: string): string {
  const id = crypto.randomUUID();
  const previewUrl = isPreviewableImage(file.type) ? URL.createObjectURL(file) : null;
  setUpload(id, { name: file.name || 'file', progress: 0, previewUrl, file: null });
  const patch = (next: Partial<UploadState>) => {
    const current = uploads.get(id);
    if (current) setUpload(id, { ...current, ...next });
  };

  uploadFile(file, pageId, (progress) => patch({ progress })).then(
    (attached) => {
      patch({ progress: 1, file: attached, previewUrl: null });
      if (!editor.isDestroyed) applyUpload(editor, id);
      // Revoke after the block has switched to the stored file.
      if (previewUrl) setTimeout(() => URL.revokeObjectURL(previewUrl), 10_000);
    },
    (error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Try again.';
      toast.error(`Couldn’t upload ${file.name || 'the file'}`, { description: message });
      setUpload(id, null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (!editor.isDestroyed) clearUpload(editor, id);
    }
  );
  return id;
}

export function useUpload(id: string | null): UploadState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (id ? uploads.get(id) : undefined),
    () => undefined
  );
}

/**
 * For a block showing an upload: fills it in once the upload finishes, and
 * clears an `uploadId` this session doesn't know (e.g. after a reload).
 */
export function useUploadSync(editor: Editor, id: string | null): UploadState | undefined {
  const upload = useUpload(id);
  useEffect(() => {
    if (!id || !editor.isEditable) return;
    if (!upload) clearUpload(editor, id);
    else if (upload.file) applyUpload(editor, id);
  }, [editor, id, upload]);
  return upload;
}

function attrsFor(node: PMNode, file: AttachedFile) {
  const src = filePath(file.id);
  if (node.type.name === 'fileBlock') {
    return { ...node.attrs, src, name: file.name, size: file.size, contentType: file.contentType, uploadId: null };
  }
  return { ...node.attrs, src, name: file.name, uploadId: null };
}

// Kept out of undo history: undo removes the block the user inserted, not
// the upload finishing.
function updateUploadBlocks(editor: Editor, id: string, attrs: (node: PMNode) => Record<string, unknown>) {
  const { tr } = editor.state;
  tr.doc.descendants((node, pos) => {
    if (node.attrs.uploadId === id) tr.setNodeMarkup(pos, undefined, attrs(node));
    return !node.isAtom;
  });
  if (!tr.docChanged) return false;
  editor.view.dispatch(tr.setMeta('addToHistory', false));
  return true;
}

function applyUpload(editor: Editor, id: string) {
  const file = uploads.get(id)?.file;
  return file ? updateUploadBlocks(editor, id, (node) => attrsFor(node, file)) : false;
}

function clearUpload(editor: Editor, id: string) {
  return updateUploadBlocks(editor, id, (node) => ({ ...node.attrs, uploadId: null }));
}
