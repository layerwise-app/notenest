// The ⋮⋮ handle beside the hovered block: drag it to move the block, click it
// for the block menu; the + beside it adds a block below and opens `/`.
import type { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { GripVertical, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { blockAtPos } from '../blocks';
import type { BlockRef } from '../blocks';
import { useSuggestion } from '../extensions/suggestions';
import { BlockMenu } from './BlockMenu';

type HoveredBlock = BlockRef & { top: number; left: number };

const HANDLE_HEIGHT = 24;

function locate(editor: Editor, wrapper: HTMLElement, block: BlockRef): HoveredBlock | null {
  const dom = editor.view.nodeDOM(block.pos);
  if (!(dom instanceof HTMLElement)) return null;
  const wrapperRect = wrapper.getBoundingClientRect();
  const rect = dom.getBoundingClientRect();
  let lineTop = rect.top + 2;
  let lineHeight = HANDLE_HEIGHT;
  if (!block.node.isAtom) {
    const text = TextSelection.findFrom(editor.state.doc.resolve(block.pos + 1), 1, true);
    if (text && text.from < block.pos + block.node.nodeSize) {
      const coords = editor.view.coordsAtPos(text.from);
      lineTop = coords.top;
      lineHeight = coords.bottom - coords.top;
    }
  }
  // List bullets and numbers sit left of the item's box.
  const markerOffset = block.node.type.name === 'listItem' ? 26 : 0;
  return {
    ...block,
    top: lineTop - wrapperRect.top + lineHeight / 2 - HANDLE_HEIGHT / 2,
    left: rect.left - wrapperRect.left - markerOffset - 50
  };
}

export function BlockHandle({ editor, wrapperRef }: { editor: Editor; wrapperRef: RefObject<HTMLDivElement | null> }) {
  const [hovered, setHovered] = useState<HoveredBlock | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const frozen = useRef(false);
  const menuWasOpen = useRef(false);
  frozen.current = menuOpen;
  const suggestionOpen = useSuggestion((state) => state.active !== null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    // Hover tracking covers the page column, including the gutter left of the text.
    const area = wrapper.closest<HTMLElement>('[data-page-column]') ?? wrapper;

    function onMove(event: MouseEvent) {
      if (frozen.current || !editor.isEditable || editor.view.dragging) return;
      const editorRect = editor.view.dom.getBoundingClientRect();
      if (event.clientY < editorRect.top || event.clientY > editorRect.bottom) {
        setHovered(null);
        return;
      }
      const left = Math.max(editorRect.left + 2, Math.min(event.clientX, editorRect.right - 2));
      const hit = editor.view.posAtCoords({ left, top: event.clientY });
      if (!hit) return;
      const block = blockAtPos(editor.state.doc, hit.pos, hit.inside);
      if (!block || !wrapper) return;
      setHovered((current) => (current?.pos === block.pos && current.node === block.node ? current : locate(editor, wrapper, block)));
    }
    function onLeave() {
      if (!frozen.current) setHovered(null);
    }
    // Typing moves blocks; hide the handle until the mouse moves again.
    function onTransaction({ transaction }: { transaction: { docChanged: boolean } }) {
      if (transaction.docChanged && !frozen.current) setHovered(null);
    }

    area.addEventListener('mousemove', onMove);
    area.addEventListener('mouseleave', onLeave);
    editor.on('transaction', onTransaction);
    return () => {
      area.removeEventListener('mousemove', onMove);
      area.removeEventListener('mouseleave', onLeave);
      editor.off('transaction', onTransaction);
    };
  }, [editor, wrapperRef]);

  if (!hovered || suggestionOpen) return null;

  function addBelow() {
    if (!hovered) return;
    const { node, pos } = hovered;
    const chain = editor.chain().focus();
    if (node.type.name === 'paragraph' && node.content.size === 0) {
      chain.setTextSelection(pos + 1).insertContent('/').run();
    } else if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
      const end = pos + node.nodeSize;
      chain
        .insertContentAt(end, { type: node.type.name, content: [{ type: 'paragraph', content: [{ type: 'text', text: '/' }] }] })
        .setTextSelection(end + 3)
        .run();
    } else {
      const end = pos + node.nodeSize;
      chain
        .insertContentAt(end, { type: 'paragraph', content: [{ type: 'text', text: '/' }] })
        .setTextSelection(end + 2)
        .run();
    }
    setHovered(null);
  }

  function selectBlock() {
    if (!hovered) return;
    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, hovered.pos)));
  }

  function onDragStart(event: React.DragEvent) {
    if (!hovered) return;
    const { view } = editor;
    const selection = NodeSelection.create(view.state.doc, hovered.pos);
    view.dispatch(view.state.tr.setSelection(selection));
    const slice = selection.content();
    const { dom, text } = view.serializeForClipboard(slice);
    event.dataTransfer.clearData();
    event.dataTransfer.setData('text/html', dom.innerHTML);
    event.dataTransfer.setData('text/plain', text);
    event.dataTransfer.effectAllowed = 'copyMove';
    const blockDom = view.nodeDOM(hovered.pos);
    if (blockDom instanceof HTMLElement) event.dataTransfer.setDragImage(blockDom, 0, 0);
    view.dragging = { slice, move: true };
  }

  return (
    <div className='notion-block-handle' style={{ top: hovered.top, left: hovered.left }} contentEditable={false}>
      <button type='button' className='notion-handle-button' onClick={addBelow} aria-label='Add a block below' title='Click to add below'>
        <Plus className='size-[18px]' strokeWidth={1.75} />
      </button>
      <div className='relative'>
        {/* The menu's trigger sits behind the grip: Radix opens menus on
            pointerdown, which would cancel dragging the block. */}
        <BlockMenu
          editor={editor}
          block={hovered}
          open={menuOpen}
          onOpenChange={(open) => {
            setMenuOpen(open);
            if (open) selectBlock();
            else setHovered(null);
          }}
        >
          <span aria-hidden className='pointer-events-none absolute inset-0' />
        </BlockMenu>
        <button
          type='button'
          draggable
          onDragStart={onDragStart}
          onDragEnd={() => setHovered(null)}
          onPointerDown={() => {
            menuWasOpen.current = menuOpen;
          }}
          onClick={() => {
            if (menuWasOpen.current) return;
            setMenuOpen(true);
            selectBlock();
          }}
          className='notion-handle-button cursor-grab'
          aria-label='Drag to move, click for options'
          aria-haspopup='menu'
          aria-expanded={menuOpen}
          title='Drag to move · Click for options'
        >
          <GripVertical className='size-[18px]' strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
