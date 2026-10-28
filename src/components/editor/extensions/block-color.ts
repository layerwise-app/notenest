// A whole-block text or background color (the block menu's "Color"),
// stored as `blockColor` on the block node.
import { Extension } from '@tiptap/core';
import { parseBlockColor } from '../colors';
import type { BlockColor } from '../colors';

export const BLOCK_COLOR_TYPES = ['paragraph', 'heading', 'blockquote', 'listItem', 'taskItem', 'details', 'callout'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockColor: {
      setBlockColor: (pos: number, color: BlockColor | null) => ReturnType;
    };
  }
}

export const BlockColorExtension = Extension.create({
  name: 'blockColor',

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_COLOR_TYPES,
        attributes: {
          blockColor: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) => parseBlockColor(element.getAttribute('data-block-color')),
            renderHTML: (attributes) =>
              attributes.blockColor ? { 'data-block-color': attributes.blockColor } : {}
          }
        }
      }
    ];
  },

  addCommands() {
    return {
      setBlockColor:
        (pos, color) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || !BLOCK_COLOR_TYPES.includes(node.type.name)) return false;
          if (dispatch) tr.setNodeAttribute(pos, 'blockColor', color);
          return true;
        }
    };
  }
});
