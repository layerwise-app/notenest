// Inline text and background colors, stored by color name. A span has one or
// the other, like Notion: setting one clears the other.
import { Mark, markInputRule, markPasteRule, mergeAttributes } from '@tiptap/core';
import { isColorName } from '../colors';
import type { ColorName } from '../colors';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineColor: {
      /** Applies a text color or background to the selection; null clears both. */
      setInlineColor: (color: { text?: ColorName; background?: ColorName } | null) => ReturnType;
    };
  }
}

export const TextColor = Mark.create({
  name: 'textColor',
  excludes: 'textColor highlight',

  addAttributes() {
    return {
      color: {
        default: 'gray',
        parseHTML: (element) => {
          const value = element.getAttribute('data-text-color');
          return isColorName(value) ? value : 'gray';
        },
        renderHTML: (attributes) => ({ 'data-text-color': attributes.color })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-text-color]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },

  renderMarkdown(node, helpers) {
    return helpers.renderChildren(node);
  },

  addCommands() {
    return {
      setInlineColor:
        (color) =>
        ({ chain }) => {
          const next = chain().unsetMark('textColor').unsetMark('highlight');
          if (color?.text) return next.setMark('textColor', { color: color.text }).run();
          if (color?.background) return next.setMark('highlight', { color: color.background }).run();
          return next.run();
        }
    };
  }
});

// `==text==` highlights in yellow, like Markdown extensions that support it.
const highlightInput = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))$/;
const highlightPaste = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))/g;

export const Highlight = Mark.create({
  name: 'highlight',
  excludes: 'textColor highlight',

  addAttributes() {
    return {
      color: {
        default: 'yellow',
        parseHTML: (element) => {
          const value = element.getAttribute('data-color');
          return isColorName(value) ? value : 'yellow';
        },
        renderHTML: (attributes) => ({ 'data-color': attributes.color })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'mark' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },

  markdownTokenName: 'highlight',
  parseMarkdown(token, helpers) {
    return helpers.applyMark('highlight', helpers.parseInline(token.tokens ?? []));
  },
  renderMarkdown(node, helpers) {
    return `==${helpers.renderChildren(node)}==`;
  },
  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: (src) => src.indexOf('=='),
    tokenize(src, _tokens, lexer) {
      const match = /^==([^=\n]+)==/.exec(src);
      if (!match) return undefined;
      return { type: 'highlight', raw: match[0], text: match[1], tokens: lexer.inlineTokens(match[1]) };
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () =>
        this.editor.isActive('highlight')
          ? this.editor.commands.unsetMark('highlight')
          : this.editor.commands.setInlineColor({ background: 'yellow' })
    };
  },

  addInputRules() {
    return [markInputRule({ find: highlightInput, type: this.type })];
  },

  addPasteRules() {
    return [markPasteRule({ find: highlightPaste, type: this.type })];
  }
});
