// Pasting Markdown (from a text editor, ChatGPT, a README…) turns it into
// blocks, like Notion. Rich HTML pastes keep the browser's normal handling.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Slice, Fragment } from '@tiptap/pm/model';
import { parseMarkdownDoc } from '../markdown';

const BLOCK_SYNTAX = /^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s?|```|~~~|\|.*\||- \[[ xX]\]\s|---\s*$|\*\*\*\s*$)/m;
const INLINE_SYNTAX = /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|~~[^~\n]+~~|!\[[^\]\n]*\]\([^)\n]+\))/;

export function looksLikeMarkdown(text: string) {
  return BLOCK_SYNTAX.test(text) || INLINE_SYNTAX.test(text);
}

// Code editors put their own HTML on the clipboard; treat it as plain text.
const isCodeEditorHtml = (html: string) => /data-vscode|vscode-|monaco|class="?cm-/i.test(html);

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handlePaste(view, event) {
            const data = event.clipboardData;
            if (!data || data.files.length) return false;
            const text = data.getData('text/plain');
            const html = data.getData('text/html');
            if (!text || (html && !isCodeEditorHtml(html))) return false;
            const { $from } = view.state.selection;
            if ($from.parent.type.spec.code) return false;
            if (!looksLikeMarkdown(text)) return false;
            // A single line of inline Markdown stays inline.
            const json = parseMarkdownDoc(text);
            const doc = editor.schema.nodeFromJSON(json);
            const inlineOnly = doc.childCount === 1 && doc.firstChild?.type.name === 'paragraph';
            const slice = inlineOnly
              ? new Slice(Fragment.from(doc.firstChild!.content), 0, 0)
              : new Slice(doc.content, 0, 0);
            view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
            return true;
          }
        }
      })
    ];
  }
});
