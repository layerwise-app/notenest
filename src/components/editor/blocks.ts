// What counts as a "block" (the unit the drag handle, block menu, and block
// shortcuts act on), and the actions on one: turn into, duplicate, delete, move.
import type { Editor } from '@tiptap/core';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';

const LIST_ITEMS = new Set(['listItem', 'taskItem']);
const LISTS = new Set(['bulletList', 'orderedList', 'taskList']);
// Nodes whose children are each a block.
const CONTAINERS = new Set(['doc', 'detailsContent', 'column']);
// Blocks whose first child is the block's own text and later children nest under it.
const ITEM_LIKE = new Set(['listItem', 'taskItem', 'callout']);

export type BlockRef = { pos: number; node: PMNode };

/** The block containing `$pos`, from the innermost level out. */
export function blockAt($pos: ResolvedPos): BlockRef | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    const parent = $pos.node(depth - 1);
    if (LIST_ITEMS.has(node.type.name)) return { pos: $pos.before(depth), node };
    if (LISTS.has(node.type.name)) continue;
    if (ITEM_LIKE.has(parent.type.name) && $pos.index(depth - 1) > 0) return { pos: $pos.before(depth), node };
    if (CONTAINERS.has(parent.type.name)) return { pos: $pos.before(depth), node };
  }
  return null;
}

/** The block at a document position, including atom blocks such as images. */
export function blockAtPos(doc: PMNode, pos: number, inside = -1): BlockRef | null {
  if (inside >= 0) {
    const node = doc.nodeAt(inside);
    if (node?.isAtom && node.isBlock) {
      const $inside = doc.resolve(inside);
      if (CONTAINERS.has($inside.parent.type.name) || ITEM_LIKE.has($inside.parent.type.name)) {
        return { pos: inside, node };
      }
    }
  }
  return blockAt(doc.resolve(Math.max(0, Math.min(pos, doc.content.size))));
}

/** The block around the current selection. */
export function selectedBlock(editor: Editor): BlockRef | null {
  const { selection } = editor.state;
  if (selection instanceof NodeSelection && selection.node.isBlock) {
    return blockAtPos(editor.state.doc, selection.from, selection.from);
  }
  return blockAt(selection.$from);
}

export type BlockTypeId =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'codeBlock';

/** The turn-into type of the block holding the selection. */
export function currentBlockType(editor: Editor): BlockTypeId {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    switch (node.type.name) {
      case 'heading':
        return `heading${Math.min(3, Number(node.attrs.level) || 1)}` as BlockTypeId;
      case 'codeBlock':
        return 'codeBlock';
      case 'taskItem':
        return 'taskList';
      case 'listItem':
        return $from.node(depth - 1).type.name === 'orderedList' ? 'orderedList' : 'bulletList';
      case 'details':
        return 'toggle';
      case 'blockquote':
        return 'quote';
      case 'callout':
        return 'callout';
      case 'column':
      case 'detailsContent':
        return 'paragraph';
    }
  }
  return 'paragraph';
}

/** Unwraps the selection's block back to plain text blocks. */
function toPlain(editor: Editor) {
  const type = currentBlockType(editor);
  const chain = editor.chain();
  switch (type) {
    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      // Lift until the text is out of every list level.
      const itemType = type === 'taskList' ? 'taskItem' : 'listItem';
      let guard = 8;
      while (guard-- > 0 && (editor.isActive('listItem') || editor.isActive('taskItem'))) {
        if (!editor.chain().liftListItem(editor.isActive('taskItem') ? 'taskItem' : itemType).run()) break;
      }
      return;
    }
    case 'toggle':
      chain.unsetDetails().run();
      return;
    case 'quote':
      chain.lift('blockquote').run();
      return;
    case 'callout':
      chain.lift('callout').run();
      return;
    case 'codeBlock':
    case 'heading1':
    case 'heading2':
    case 'heading3':
      chain.setParagraph().run();
      return;
  }
}

/** Converts the selection's block, like Notion's "Turn into". */
export function turnInto(editor: Editor, target: BlockTypeId) {
  const current = currentBlockType(editor);
  const lists: BlockTypeId[] = ['bulletList', 'orderedList', 'taskList'];
  if (current === target) return;
  if (lists.includes(current) && lists.includes(target)) {
    const chain = editor.chain().focus();
    if (target === 'bulletList') chain.toggleBulletList().run();
    else if (target === 'orderedList') chain.toggleOrderedList().run();
    else chain.toggleTaskList().run();
    return;
  }
  toPlain(editor);
  const chain = editor.chain().focus();
  switch (target) {
    case 'paragraph':
      chain.setParagraph().run();
      break;
    case 'heading1':
    case 'heading2':
    case 'heading3':
      chain.setNode('heading', { level: Number(target.slice(-1)) }).run();
      break;
    case 'bulletList':
      chain.setParagraph().toggleBulletList().run();
      break;
    case 'orderedList':
      chain.setParagraph().toggleOrderedList().run();
      break;
    case 'taskList':
      chain.setParagraph().toggleTaskList().run();
      break;
    case 'toggle':
      chain.setParagraph().setDetails().run();
      break;
    case 'quote':
      chain.setParagraph().wrapIn('blockquote').run();
      break;
    case 'callout':
      chain.setParagraph().wrapIn('callout').run();
      break;
    case 'codeBlock':
      chain.setCodeBlock().run();
      break;
  }
}

/** Puts the cursor at the end of a block's text so commands act on it. */
export function selectBlockText(editor: Editor, block: BlockRef) {
  const { doc } = editor.state;
  const inner = Math.min(block.pos + 1, doc.content.size);
  const selection = TextSelection.findFrom(doc.resolve(inner), 1, true);
  if (!selection) return false;
  // Stay inside the block's first text line.
  const $start = selection.$from;
  const end = $start.end();
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(doc, end)));
  return true;
}

export function deleteBlock(editor: Editor, block: BlockRef) {
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.delete(block.pos, block.pos + block.node.nodeSize);
      return true;
    })
    .run();
}

export function duplicateBlock(editor: Editor, block: BlockRef) {
  const after = block.pos + block.node.nodeSize;
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      tr.insert(after, block.node.copy(block.node.content));
      const selection = TextSelection.findFrom(tr.doc.resolve(after + 1), 1, true);
      if (selection) tr.setSelection(selection);
      return true;
    })
    .run();
}

/** Swaps a block with its previous or next sibling. */
export function moveBlock(editor: Editor, block: BlockRef, direction: -1 | 1) {
  const { doc } = editor.state;
  const $pos = doc.resolve(block.pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const siblingIndex = index + direction;
  if (siblingIndex < 0 || siblingIndex >= parent.childCount) return false;
  const sibling = parent.child(siblingIndex);
  const selectionOffset = editor.state.selection.from - block.pos;
  return editor
    .chain()
    .command(({ tr }) => {
      if (direction === 1) {
        const siblingPos = block.pos + block.node.nodeSize;
        tr.delete(siblingPos, siblingPos + sibling.nodeSize);
        tr.insert(block.pos, sibling);
        const newPos = block.pos + sibling.nodeSize;
        tr.setSelection(TextSelection.near(tr.doc.resolve(newPos + Math.max(1, selectionOffset))));
      } else {
        const siblingPos = block.pos - sibling.nodeSize;
        tr.delete(block.pos, block.pos + block.node.nodeSize);
        tr.insert(siblingPos, block.node);
        tr.setSelection(TextSelection.near(tr.doc.resolve(siblingPos + Math.max(1, selectionOffset))));
      }
      tr.scrollIntoView();
      return true;
    })
    .run();
}

/** Inserts block content in place of an empty block, or after a non-empty one. */
export function insertBlocks(editor: Editor, content: object | object[], range?: { from: number; to: number }) {
  const chain = editor.chain().focus();
  if (range) chain.deleteRange(range);
  chain
    .command(({ tr, state }) => {
      const $from = tr.selection.$from;
      const block = blockAt($from);
      const items = (Array.isArray(content) ? content : [content]).map((json) => state.schema.nodeFromJSON(json));
      if (!block) {
        tr.replaceSelectionWith(items[0]);
        return true;
      }
      const isEmptyText = block.node.isTextblock && block.node.content.size === 0;
      const insertAt = isEmptyText ? block.pos : block.pos + block.node.nodeSize;
      // An atom at the end of a container needs a text block after it to keep typing.
      const last = items[items.length - 1];
      const $insert = tr.doc.resolve(insertAt);
      const parentEnd = $insert.end();
      const endsContainer = (isEmptyText ? block.pos + block.node.nodeSize : insertAt) >= parentEnd;
      const nodes = last.isAtom && endsContainer ? [...items, state.schema.nodes.paragraph.create()] : items;
      if (isEmptyText) tr.replaceWith(block.pos, block.pos + block.node.nodeSize, nodes);
      else tr.insert(insertAt, nodes);
      const size = items.reduce((total, node) => total + node.nodeSize, 0);
      const firstNode = items[0];
      const target = insertAt + size;
      if (firstNode.isAtom) {
        tr.setSelection(NodeSelection.create(tr.doc, insertAt));
      } else {
        const selection = TextSelection.findFrom(tr.doc.resolve(insertAt + 1), 1, true);
        if (selection && selection.from < target) tr.setSelection(selection);
      }
      tr.scrollIntoView();
      return true;
    })
    .run();
}
