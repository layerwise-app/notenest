// Toggle lists (Tiptap's details nodes). `>` + space turns the current line
// into a toggle, like Notion. Whether a toggle is open lives in its `open`
// attribute, and CSS hides the content of closed toggles.
import { Extension, InputRule } from '@tiptap/core';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import { TextSelection } from '@tiptap/pm/state';

export const Toggle = Details.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute('open') || element.classList.contains('is-open'),
        renderHTML: ({ open }) => (open ? { open: '' } : {})
      }
    };
  },

  renderMarkdown(node, helpers) {
    const [summary, content] = node.content ?? [];
    const title = summary ? helpers.renderChildren(summary.content ?? []) : '';
    const body = content ? helpers.renderChildren(content.content ?? [], '\n\n') : '';
    return `<details>\n<summary>${title}</summary>\n\n${body}\n\n</details>`;
  },

  // Tiptap's view flips `hidden` on the content imperatively, which drifts out
  // of sync when either view is recreated. This one renders from the node.
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.dataset.type = 'details';
      dom.className = 'notion-toggle';
      const button = document.createElement('button');
      button.type = 'button';
      button.contentEditable = 'false';
      const content = document.createElement('div');
      dom.appendChild(button);
      dom.appendChild(content);

      let current = node;
      const render = () => {
        dom.classList.toggle('is-open', Boolean(current.attrs.open));
        button.setAttribute('aria-label', current.attrs.open ? 'Collapse' : 'Expand');
        if (current.attrs.blockColor) dom.dataset.blockColor = current.attrs.blockColor;
        else delete dom.dataset.blockColor;
      };
      render();

      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const pos = getPos();
        if (typeof pos !== 'number') return;
        const target = editor.state.doc.nodeAt(pos);
        if (!target) return;
        editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'open', !target.attrs.open));
      });

      return {
        dom,
        contentDOM: content,
        ignoreMutation: (mutation) => mutation.type !== 'selection' && (button.contains(mutation.target) || mutation.target === dom),
        update: (updated) => {
          if (updated.type !== current.type) return false;
          current = updated;
          render();
          return true;
        }
      };
    };
  }
}).configure({
  persist: true
});

export const ToggleSummary = DetailsSummary;

export const ToggleContent = DetailsContent.extend({
  addNodeView() {
    return null as never;
  }
});

export const ToggleInputRule = Extension.create({
  name: 'toggleInputRule',
  addInputRules() {
    return [
      new InputRule({
        find: /^>\s$/,
        handler: ({ range, chain, state }) => {
          if (state.selection.$from.parent.type.name !== 'paragraph') return null;
          chain().deleteRange(range).setDetails().run();
        }
      })
    ];
  }
});

/** ↵ on an empty last line inside a toggle moves out below it, like Notion. */
export const ToggleExit = Extension.create({
  name: 'toggleExit',
  priority: 110,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state, view } = this.editor;
        const { $from, empty } = state.selection;
        // In a toggle's title: open toggles continue into their first line
        // (reusing an empty one); closed toggles start a new toggle below.
        if (empty && $from.parent.type.name === 'detailsSummary' && $from.parentOffset === $from.parent.content.size) {
          const details = $from.node(-1);
          const detailsPos = $from.before(-1);
          if (details.attrs.open) {
            const content = details.child(1);
            const first = content.firstChild;
            const contentStart = detailsPos + 1 + details.child(0).nodeSize + 1;
            let tr = state.tr;
            if (!(first?.type.name === 'paragraph' && first.content.size === 0)) {
              tr = tr.insert(contentStart, state.schema.nodes.paragraph.create());
            }
            view.dispatch(tr.setSelection(TextSelection.create(tr.doc, contentStart + 1)).scrollIntoView());
            return true;
          }
          const after = detailsPos + details.nodeSize;
          const toggle = state.schema.nodes.details.createAndFill({ open: false });
          if (!toggle) return false;
          const tr = state.tr.insert(after, toggle);
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 2)).scrollIntoView());
          return true;
        }
        if (!empty || $from.parent.type.name !== 'paragraph' || $from.parent.content.size > 0) return false;
        if ($from.depth < 3 || $from.node(-1).type.name !== 'detailsContent') return false;
        const content = $from.node(-1);
        if ($from.index(-1) !== content.childCount - 1) return false;
        const detailsPos = $from.before(-2);
        const details = $from.node(-2);
        let tr = state.tr;
        let after = detailsPos + details.nodeSize;
        if (content.childCount > 1) {
          tr = tr.delete($from.before(), $from.after());
          after = tr.mapping.map(after);
        }
        tr = tr.insert(after, state.schema.nodes.paragraph.create());
        view.dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView());
        return true;
      }
    };
  }
});
