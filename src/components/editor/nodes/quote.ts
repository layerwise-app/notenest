// Notion's quote: `"` + space starts one (`>` starts a toggle instead).
import Blockquote from '@tiptap/extension-blockquote';
import { wrappingInputRule } from '@tiptap/core';

export const Quote = Blockquote.extend({
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*["“]\s$/, type: this.type })];
  }
});
