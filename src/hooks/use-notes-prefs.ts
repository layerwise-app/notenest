// Remembers notebook layout choices (view, sort, editor mode, open note)
// per browser. Only used client-side, after the notebook has hydrated.
import { useEffect, useState } from 'react';
import type { EditorMode } from '~/components/notes/NoteEditor';
import { SORT_LABELS } from '~/lib/notebook';
import type { NotesView, SortKey } from '~/lib/notebook';

const PREFS_KEY = 'notenest.ui.v1';
const MODES: EditorMode[] = ['edit', 'split', 'preview'];

export type NotesPrefs = {
  view: NotesView;
  sort: SortKey;
  mode: EditorMode;
  selectedId: string | null;
};

const DEFAULT_PREFS: NotesPrefs = { view: 'all', sort: 'edited', mode: 'edit', selectedId: null };

function isView(value: unknown): value is NotesView {
  return (
    typeof value === 'string' &&
    (value === 'all' || value === 'pinned' || value === 'trash' || /^(folder|tag):.+/.test(value))
  );
}

function readPrefs(): NotesPrefs {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null');
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFS;
    const saved = parsed as Record<string, unknown>;
    return {
      view: isView(saved.view) ? saved.view : DEFAULT_PREFS.view,
      sort: typeof saved.sort === 'string' && saved.sort in SORT_LABELS ? (saved.sort as SortKey) : DEFAULT_PREFS.sort,
      mode: MODES.includes(saved.mode as EditorMode) ? (saved.mode as EditorMode) : DEFAULT_PREFS.mode,
      selectedId: typeof saved.selectedId === 'string' ? saved.selectedId : null
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useNotesPrefs() {
  const [prefs, setPrefs] = useState(readPrefs);

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Layout prefs are a convenience; a full or blocked storage just skips them.
    }
  }, [prefs]);

  function patchPrefs(patch: Partial<NotesPrefs>) {
    setPrefs((current) => ({ ...current, ...patch }));
  }

  return [prefs, patchPrefs] as const;
}
