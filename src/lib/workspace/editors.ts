// Editors currently open, by page id. Lets workspace actions change a page
// that is being edited through its editor (so pending typing isn't lost),
// and lets sync or sign-out flush typing that hasn't been saved yet.
import type { Editor } from '@tiptap/core';

type OpenEditor = { editor: Editor; flush: () => void };

const open = new Map<string, OpenEditor>();

export function registerEditor(pageId: string, entry: OpenEditor) {
  open.set(pageId, entry);
  return () => {
    if (open.get(pageId) === entry) open.delete(pageId);
  };
}

export const openEditor = (pageId: string) => open.get(pageId)?.editor ?? null;

/** Saves typing that is still waiting on the editor's debounce. */
export function flushEditors() {
  for (const entry of open.values()) entry.flush();
}
