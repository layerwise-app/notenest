// Typing triggers: `/` opens the block menu, `@` mentions a page or date,
// `[[` links a page, `:` picks an emoji. The plugins only track the trigger
// text; the menus render in React (menus/SuggestionMenu.tsx) from this state.
import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { exitSuggestion } from '@tiptap/suggestion';
import { create } from 'zustand';

export type SuggestionKind = 'slash' | 'mention' | 'link' | 'emoji';

export type ActiveSuggestion = {
  kind: SuggestionKind;
  query: string;
  range: Range;
  clientRect: (() => DOMRect | null) | null;
  /** Opened from a slash command: "Link to page" inserts a block, "/emoji" shows the full grid. */
  fromSlash: boolean;
};

export const useSuggestion = create<{ active: ActiveSuggestion | null }>(() => ({ active: null }));

/** Set by the open menu to take arrow keys, Enter, and Tab. */
export const suggestionKeys: { handler: ((event: KeyboardEvent) => boolean) | null } = { handler: null };

// The next trigger typed by a slash command opens in slash mode.
let nextFromSlash: SuggestionKind | null = null;
export const openFromSlash = (kind: SuggestionKind) => {
  nextFromSlash = kind;
};

const keys: Record<SuggestionKind, PluginKey> = {
  slash: new PluginKey('slashSuggestion'),
  mention: new PluginKey('mentionSuggestion'),
  link: new PluginKey('linkSuggestion'),
  emoji: new PluginKey('emojiSuggestion')
};

export function closeSuggestion(editor: Editor) {
  const active = useSuggestion.getState().active;
  if (active) exitSuggestion(editor.view, keys[active.kind]);
  useSuggestion.setState({ active: null });
}

const inCode = (state: EditorState, pos: number) => {
  const $pos = state.doc.resolve(pos);
  return $pos.parent.type.spec.code === true || $pos.marks().some((mark) => mark.type.name === 'code');
};

function trigger(editor: Editor, kind: SuggestionKind, char: string, allowSpaces: boolean) {
  let fromSlash = false;
  const publish = (props: { query: string; range: Range; clientRect?: (() => DOMRect | null) | null }) => {
    useSuggestion.setState({
      active: { kind, query: props.query, range: props.range, clientRect: props.clientRect ?? null, fromSlash }
    });
  };
  return Suggestion({
    editor,
    char,
    pluginKey: keys[kind],
    allowSpaces,
    startOfLine: false,
    decorationClass: 'notion-suggestion',
    decorationEmptyClass: 'is-empty',
    decorationContent: kind === 'slash' ? 'Filter…' : '',
    allow: ({ state, range }) => editor.isEditable && !inCode(state, range.from),
    items: () => [],
    render: () => ({
      onStart: (props) => {
        fromSlash = nextFromSlash === kind;
        nextFromSlash = null;
        publish(props);
      },
      onUpdate: publish,
      onExit: () => {
        if (useSuggestion.getState().active?.kind === kind) useSuggestion.setState({ active: null });
      },
      onKeyDown: ({ event, view }) => {
        if (event.key === 'Escape') {
          exitSuggestion(view, keys[kind]);
          useSuggestion.setState({ active: null });
          return true;
        }
        return suggestionKeys.handler?.(event) ?? false;
      }
    })
  });
}

export const Suggestions = Extension.create({
  name: 'suggestions',
  addProseMirrorPlugins() {
    return [
      trigger(this.editor, 'slash', '/', true),
      trigger(this.editor, 'mention', '@', true),
      trigger(this.editor, 'link', '[[', true),
      trigger(this.editor, 'emoji', ':', false)
    ];
  }
});
