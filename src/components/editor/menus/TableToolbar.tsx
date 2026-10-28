// Row and column actions above a table while the caret is in it.
import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { BubbleMenu } from '@tiptap/react/menus';
import { ArrowDownToLine, ArrowRightToLine, Columns2, Rows2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

function tableElement(editor: Editor): HTMLElement | null {
  const { from } = editor.state.selection;
  const { node } = editor.view.domAtPos(from);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  return element?.closest('table') ?? null;
}

export function TableToolbar({ editor }: { editor: Editor }) {
  return (
    <BubbleMenu
      editor={editor}
      pluginKey='tableToolbar'
      updateDelay={60}
      options={{ placement: 'top-start', offset: 6, flip: false, shift: { padding: 8 } }}
      shouldShow={({ editor: current, from, to }) =>
        current.isEditable && current.isActive('table') && (from === to || current.state.selection instanceof CellSelection)
      }
      getReferencedVirtualElement={() => {
        const table = tableElement(editor);
        return table ? { getBoundingClientRect: () => table.getBoundingClientRect() } : null;
      }}
      className='notion-menu z-30 flex items-center gap-0.5 p-1'
    >
      <Action label='Add row below' onClick={() => editor.chain().focus().addRowAfter().run()}>
        <ArrowDownToLine className='size-4' />
        Row
      </Action>
      <Action label='Add column right' onClick={() => editor.chain().focus().addColumnAfter().run()}>
        <ArrowRightToLine className='size-4' />
        Column
      </Action>
      <span className='mx-0.5 h-5 w-px bg-border' />
      <Action label='Toggle header row' onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
        <Rows2 className='size-4' />
      </Action>
      <Action label='Toggle header column' onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
        <Columns2 className='size-4' />
      </Action>
      <span className='mx-0.5 h-5 w-px bg-border' />
      <Action label='Delete row' onClick={() => editor.chain().focus().deleteRow().run()}>
        <span className='text-[13px]'>− Row</span>
      </Action>
      <Action label='Delete column' onClick={() => editor.chain().focus().deleteColumn().run()}>
        <span className='text-[13px]'>− Column</span>
      </Action>
      <Action label='Delete table' onClick={() => editor.chain().focus().deleteTable().run()}>
        <Trash2 className='size-4' />
      </Action>
    </BubbleMenu>
  );
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type='button'
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className='notion-toolbar-button gap-1 px-1.5 text-[13px]'
    >
      {children}
    </button>
  );
}
