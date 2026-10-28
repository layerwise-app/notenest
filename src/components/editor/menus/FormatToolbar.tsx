// The toolbar over selected text: turn into, link, marks, equation, color.
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, ChevronDown, Code, Italic, Link2, Sigma, Strikethrough, Underline } from 'lucide-react';
import type { ReactNode } from 'react';
import { create } from 'zustand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';
import { COLOR_LABELS, COLORS } from '../colors';
import { currentBlockType, turnInto } from '../blocks';
import { useSuggestion } from '../extensions/suggestions';
import { TURN_INTO_OPTIONS } from './BlockMenu';
import { LinkEditor } from './LinkEditor';

/** Open while the link field replaces the toolbar buttons (⌘K or the link button). */
export const useLinkEditing = create<{ open: boolean }>(() => ({ open: false }));

export function FormatToolbar({ editor }: { editor: Editor }) {
  const linkOpen = useLinkEditing((state) => state.open);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      code: current.isActive('code'),
      link: current.isActive('link'),
      textColor: (current.getAttributes('textColor').color as string | undefined) ?? null,
      background: current.isActive('highlight') ? ((current.getAttributes('highlight').color as string | undefined) ?? 'yellow') : null,
      blockType: currentBlockType(current)
    })
  });

  const turnLabel = TURN_INTO_OPTIONS.find((option) => option.id === state.blockType)?.label ?? 'Text';

  return (
    <BubbleMenu
      editor={editor}
      pluginKey='formatToolbar'
      updateDelay={120}
      options={{ placement: 'top-start', offset: 8, flip: true, shift: { padding: 8 }, onHide: () => useLinkEditing.setState({ open: false }) }}
      shouldShow={({ editor: current, state: editorState, from, to }) => {
        if (!current.isEditable || from === to) return false;
        if (editorState.selection instanceof NodeSelection) return false;
        if (useSuggestion.getState().active) return false;
        if (current.isActive('codeBlock')) return false;
        // Skip selections made only of non-text nodes (images, page blocks…).
        return editorState.doc.textBetween(from, to, ' ', ' ').trim().length > 0;
      }}
      className='notion-menu z-40 flex items-center p-1'
    >
      {linkOpen ? (
        <LinkEditor editor={editor} onClose={() => useLinkEditing.setState({ open: false })} />
      ) : (
        <div className='flex items-center gap-0.5'>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className='notion-toolbar-button gap-1 px-2'>
              {turnLabel}
              <ChevronDown className='size-3 opacity-60' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-52' onCloseAutoFocus={(event) => event.preventDefault()}>
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Turn into</DropdownMenuLabel>
              {TURN_INTO_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.id} onSelect={() => turnInto(editor, option.id)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Divider />
          <ToolbarButton label='Link · ⌘K' active={state.link} onClick={() => useLinkEditing.setState({ open: true })}>
            <Link2 className='size-4' />
            <span className='text-[13px]'>Link</span>
          </ToolbarButton>
          <Divider />
          <ToolbarButton label='Bold · ⌘B' active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className='size-4' strokeWidth={2.5} />
          </ToolbarButton>
          <ToolbarButton label='Italic · ⌘I' active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className='size-4' />
          </ToolbarButton>
          <ToolbarButton label='Underline · ⌘U' active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <Underline className='size-4' />
          </ToolbarButton>
          <ToolbarButton label='Strikethrough · ⌘⇧S' active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className='size-4' />
          </ToolbarButton>
          <ToolbarButton label='Code · ⌘E' active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code className='size-4' />
          </ToolbarButton>
          <ToolbarButton label='Equation' onClick={() => toEquation(editor)}>
            <Sigma className='size-4' />
          </ToolbarButton>
          <Divider />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className='notion-toolbar-button gap-1 px-1.5' title='Color'>
              <span className='notion-swatch' data-text-color={state.textColor ?? undefined} data-bg-color={state.background ?? undefined}>
                A
              </span>
              <ChevronDown className='size-3 opacity-60' />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='max-h-96 w-52 overflow-y-auto' onCloseAutoFocus={(event) => event.preventDefault()}>
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Text color</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => editor.chain().focus().setInlineColor(null).run()}>
                <span className='notion-swatch'>A</span>
                Default
              </DropdownMenuItem>
              {COLORS.map((color) => (
                <DropdownMenuItem key={color} onSelect={() => editor.chain().focus().setInlineColor({ text: color }).run()}>
                  <span className='notion-swatch' data-text-color={color}>A</span>
                  {COLOR_LABELS[color]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Background color</DropdownMenuLabel>
              {COLORS.map((color) => (
                <DropdownMenuItem key={color} onSelect={() => editor.chain().focus().setInlineColor({ background: color }).run()}>
                  <span className='notion-swatch' data-bg-color={color}>A</span>
                  {COLOR_LABELS[color]} background
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </BubbleMenu>
  );
}

/** Turns the selected text into an inline equation, like Notion's √x button. */
function toEquation(editor: Editor) {
  const { from, to } = editor.state.selection;
  const latex = editor.state.doc.textBetween(from, to, ' ').trim();
  if (!latex) return;
  editor.chain().focus().insertContentAt({ from, to }, { type: 'inlineMath', attrs: { latex } }).run();
}

function Divider() {
  return <span className='mx-0.5 h-5 w-px bg-border' />;
}

function ToolbarButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn('notion-toolbar-button', active && 'text-primary')}
    >
      {children}
    </button>
  );
}
