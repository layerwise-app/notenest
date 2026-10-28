// Editing for block and inline equations. Tiptap's math nodes render KaTeX
// and report clicks; this opens a small LaTeX editor beside the equation.
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import katex from 'katex';
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';

type MathTarget = { kind: 'block' | 'inline'; pos: number; latex: string; rect: DOMRect };

const useMathTarget = create<{ target: MathTarget | null }>(() => ({ target: null }));

// Set by the open editor; the math extensions call these on click.
export const mathClickHandlers: {
  block?: (node: PMNode, pos: number) => void;
  inline?: (node: PMNode, pos: number) => void;
} = {};

export function openMathEditor(editor: Editor, kind: 'block' | 'inline', pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  const dom = editor.view.nodeDOM(pos);
  if (!node || !(dom instanceof HTMLElement)) return;
  useMathTarget.setState({ target: { kind, pos, latex: String(node.attrs.latex ?? ''), rect: dom.getBoundingClientRect() } });
}

export function bindMathClicks(editor: Editor) {
  mathClickHandlers.block = (_node, pos) => editor.isEditable && openMathEditor(editor, 'block', pos);
  mathClickHandlers.inline = (_node, pos) => editor.isEditable && openMathEditor(editor, 'inline', pos);
}

/** The floating LaTeX editor; rendered once by the page editor. */
export function MathEditor({ editor }: { editor: Editor }) {
  const target = useMathTarget((state) => state.target);
  if (!target) return null;
  return <MathEditorPanel key={`${target.kind}:${target.pos}`} editor={editor} target={target} />;
}

function MathEditorPanel({ editor, target }: { editor: Editor; target: MathTarget }) {
  const [latex, setLatex] = useState(target.latex);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function close(save: boolean) {
    useMathTarget.setState({ target: null });
    const value = latex.trim();
    const chain = editor.chain().focus();
    if (target.kind === 'block') {
      if (!value) chain.deleteBlockMath({ pos: target.pos }).run();
      else if (save) chain.updateBlockMath({ latex: value, pos: target.pos }).run();
    } else if (!value) {
      chain.deleteInlineMath({ pos: target.pos }).run();
    } else if (save) {
      chain.updateInlineMath({ latex: value, pos: target.pos }).run();
    }
  }

  // Clicking anywhere else saves, like Notion.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) close(true);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  });

  let preview = '';
  try {
    preview = latex.trim() ? katex.renderToString(latex, { throwOnError: true, displayMode: target.kind === 'block' }) : '';
  } catch {
    preview = '';
  }

  const top = Math.min(target.rect.bottom + 6, window.innerHeight - 220);
  const left = Math.max(12, Math.min(target.rect.left, window.innerWidth - 392));

  return (
    <div
      ref={panelRef}
      className='notion-menu fixed z-50 flex w-[380px] flex-col gap-2 p-2'
      style={{ top, left }}
      role='dialog'
      aria-label='Edit equation'
    >
      <textarea
        ref={inputRef}
        value={latex}
        onChange={(event) => setLatex(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            close(true);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            close(false);
          }
        }}
        rows={3}
        placeholder='E = mc^2'
        spellCheck={false}
        className='notion-input h-auto resize-none py-2 font-mono text-[13px]'
      />
      {latex.trim() && !preview ? <p className='px-1 text-[12px] text-destructive'>Invalid equation</p> : null}
      <div className='flex items-center justify-between gap-2 px-1'>
        <span className='text-[12px] text-muted-foreground'>LaTeX · ⇧↵ for a new line</span>
        <button
          type='button'
          onClick={() => close(true)}
          className='h-7 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:opacity-90'
        >
          Done
        </button>
      </div>
    </div>
  );
}
