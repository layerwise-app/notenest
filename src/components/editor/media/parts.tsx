// Pieces shared by the media node views: the hover toolbar, the caption,
// width and height resize handles, and editor helpers.
import type { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { useEditorState } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';

/**
 * ProseMirror ignores events from the block's own controls (toolbar, caption,
 * players, resize handles); everything else, including dragging the block,
 * behaves like any atom block.
 */
export function stopMediaEvent({ event }: { event: Event }) {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  if (event.type === 'drop' || event.type.startsWith('drag')) return target.closest('input, textarea') !== null;
  return target.closest('input, textarea, button, select, a, audio, video, iframe, [data-media-control]') !== null;
}

export const mediaNodeViewOptions = { stopEvent: stopMediaEvent };

export function useEditable(editor: Editor) {
  return useEditorState({ editor, selector: ({ editor: current }) => current.isEditable });
}

export function isNodeSelected(editor: Editor, getPos: NodeViewProps['getPos']) {
  const { selection } = editor.state;
  return selection instanceof NodeSelection && selection.from === getPos();
}

/** Updates the block's attrs without an undo step (fetched or derived data). */
export function setAttrsQuietly(editor: Editor, getPos: NodeViewProps['getPos'], attrs: Record<string, unknown>) {
  const pos = getPos();
  if (typeof pos !== 'number' || editor.isDestroyed) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }).setMeta('addToHistory', false)
  );
}

/**
 * Puts the caret in the text block after the block at `pos`, adding one if
 * needed, so typing doesn't replace the selected block.
 */
export function focusAfter(editor: Editor, pos: number | undefined) {
  if (typeof pos !== 'number') return;
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const node = tr.doc.nodeAt(pos);
      if (!node) return false;
      const after = pos + node.nodeSize;
      const $after = tr.doc.resolve(after);
      if (!$after.nodeAfter?.isTextblock) {
        const paragraph = state.schema.nodes.paragraph;
        if (!$after.parent.canReplaceWith($after.index(), $after.index(), paragraph)) return false;
        tr.insert(after, paragraph.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
      return true;
    })
    .run();
}

export function MediaToolbar({ children }: { children: ReactNode }) {
  return (
    <div className='media-toolbar' data-media-control>
      {children}
    </div>
  );
}

export function ToolbarDivider() {
  return <span className='media-toolbar-divider' />;
}

type ToolbarButtonProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  download?: string;
  active?: boolean;
  children: ReactNode;
};

export function ToolbarButton({ label, onClick, href, download, active, children }: ToolbarButtonProps) {
  const shared = {
    className: 'media-toolbar-button',
    'aria-label': label,
    'data-active': active ? 'true' : undefined,
    // Keep focus (and the selection) in the editor.
    onMouseDown: (event: React.MouseEvent) => event.preventDefault()
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <a {...shared} href={href} download={download} target={download === undefined ? '_blank' : undefined} rel='noopener noreferrer'>
            {children}
          </a>
        ) : (
          <button {...shared} type='button' onClick={onClick}>
            {children}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side='top'>{label}</TooltipContent>
    </Tooltip>
  );
}

type CaptionProps = {
  value: string;
  editable: boolean;
  /** Shown empty, focused, after "Caption" in the toolbar. */
  open: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
  onExit: () => void;
};

export function MediaCaption({ value, editable, open, onClose, onChange, onExit }: CaptionProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // While typing, the field owns the text; node updates arrive a render later.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${field.scrollHeight}px`;
  }, [text, open]);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!editable) return value ? <div className='media-caption'>{value}</div> : null;
  if (!value && !open && draft === null) return null;
  return (
    <textarea
      ref={ref}
      className='media-caption'
      rows={1}
      value={text}
      placeholder='Write a caption'
      onFocus={() => setDraft(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(event.target.value);
      }}
      onBlur={() => {
        setDraft(null);
        if (!text.trim()) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onExit();
        } else if (event.key === 'Escape') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

type DragOptions = {
  axis: 'x' | 'y';
  onMove: (delta: number) => void;
  onEnd: () => void;
};

/** Pointer-drag handler for a resize handle; reports the distance moved. */
function startDrag(event: React.PointerEvent<HTMLElement>, { axis, onMove, onEnd }: DragOptions) {
  if (event.button !== 0) return;
  event.stopPropagation();
  const handle = event.currentTarget;
  const start = axis === 'x' ? event.clientX : event.clientY;
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add(axis === 'x' ? 'media-resizing-x' : 'media-resizing-y');
  const move = (next: PointerEvent) => onMove((axis === 'x' ? next.clientX : next.clientY) - start);
  const end = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    document.body.classList.remove('media-resizing-x', 'media-resizing-y');
    onEnd();
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

// Stops text selection and the block's native drag from starting.
const preventMouseDown = (event: React.MouseEvent) => event.preventDefault();

const MIN_WIDTH = 80;

type WidthHandlesProps = {
  frame: React.RefObject<HTMLElement | null>;
  align: 'left' | 'center' | 'right';
  onPreview: (width: number | null) => void;
  onCommit: (width: number) => void;
};

/** Left and right handles that resize a block's width, like Notion's images. */
export function WidthHandles({ frame, align, onPreview, onCommit }: WidthHandlesProps) {
  const begin = (side: -1 | 1) => (event: React.PointerEvent<HTMLElement>) => {
    const element = frame.current;
    const column = element?.closest('[data-node-view-wrapper]');
    if (!element || !column) return;
    const startWidth = element.getBoundingClientRect().width;
    const max = column.getBoundingClientRect().width;
    // A centered block grows on both sides, so the handle keeps up with the pointer.
    const factor = align === 'center' ? 2 : 1;
    let width = startWidth;
    startDrag(event, {
      axis: 'x',
      onMove: (delta) => {
        width = Math.min(max, Math.max(MIN_WIDTH, startWidth + side * factor * delta));
        onPreview(width);
      },
      onEnd: () => {
        onPreview(null);
        if (Math.round(width) !== Math.round(startWidth)) onCommit(Math.round(width));
      }
    });
  };
  return (
    <>
      <div className='media-resize-handle' data-side='left' data-media-control onMouseDown={preventMouseDown} onPointerDown={begin(-1)} />
      <div className='media-resize-handle' data-side='right' data-media-control onMouseDown={preventMouseDown} onPointerDown={begin(1)} />
    </>
  );
}

type HeightHandleProps = {
  height: number;
  onPreview: (height: number | null) => void;
  onCommit: (height: number) => void;
};

export function HeightHandle({ height, onPreview, onCommit }: HeightHandleProps) {
  const begin = (event: React.PointerEvent<HTMLElement>) => {
    let next = height;
    startDrag(event, {
      axis: 'y',
      onMove: (delta) => {
        next = Math.min(2000, Math.max(120, height + delta));
        onPreview(next);
      },
      onEnd: () => {
        onPreview(null);
        if (Math.round(next) !== height) onCommit(Math.round(next));
      }
    });
  };
  return <div className='media-height-handle' data-media-control onMouseDown={preventMouseDown} onPointerDown={begin} />;
}
