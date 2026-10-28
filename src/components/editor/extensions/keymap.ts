// Notion's keyboard shortcuts for blocks.
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { useLinkEditing } from '../menus/FormatToolbar';
import { duplicateBlock, moveBlock, selectedBlock, turnInto } from '../blocks';
import type { BlockTypeId } from '../blocks';

const TURN_INTO_KEYS: Record<string, BlockTypeId> = {
  'Mod-Alt-0': 'paragraph',
  'Mod-Alt-1': 'heading1',
  'Mod-Alt-2': 'heading2',
  'Mod-Alt-3': 'heading3',
  'Mod-Alt-4': 'taskList',
  'Mod-Alt-5': 'bulletList',
  'Mod-Alt-6': 'orderedList',
  'Mod-Alt-7': 'toggle',
  'Mod-Alt-8': 'codeBlock'
};

export const NotionKeymap = Extension.create({
  name: 'notionKeymap',

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {};
    for (const [key, type] of Object.entries(TURN_INTO_KEYS)) {
      shortcuts[key] = () => {
        turnInto(this.editor, type);
        return true;
      };
    }
    return {
      ...shortcuts,
      // ⌘K links the selected text; with nothing selected it opens search.
      'Mod-k': () => {
        if (this.editor.state.selection.empty) return false;
        useLinkEditing.setState({ open: true });
        return true;
      },
      'Mod-d': () => {
        const block = selectedBlock(this.editor);
        if (!block) return false;
        duplicateBlock(this.editor, block);
        return true;
      },
      'Mod-Shift-ArrowUp': () => {
        const block = selectedBlock(this.editor);
        return block ? moveBlock(this.editor, block, -1) : false;
      },
      'Mod-Shift-ArrowDown': () => {
        const block = selectedBlock(this.editor);
        return block ? moveBlock(this.editor, block, 1) : false;
      },
      // ⌘↵ checks a to-do or opens/closes a toggle.
      'Mod-Enter': () => {
        const { $from } = this.editor.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === 'taskItem') {
            const pos = $from.before(depth);
            this.editor.view.dispatch(this.editor.state.tr.setNodeAttribute(pos, 'checked', !node.attrs.checked));
            return true;
          }
          if (node.type.name === 'details') {
            const pos = $from.before(depth);
            this.editor.view.dispatch(this.editor.state.tr.setNodeAttribute(pos, 'open', !node.attrs.open));
            return true;
          }
        }
        return false;
      },
      // Escape collapses a text selection, then leaves the editor.
      Escape: () => {
        const { state, view } = this.editor;
        if (state.selection instanceof TextSelection && !state.selection.empty) {
          view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, state.selection.to)));
          return true;
        }
        this.editor.commands.blur();
        return true;
      }
    };
  }
});
