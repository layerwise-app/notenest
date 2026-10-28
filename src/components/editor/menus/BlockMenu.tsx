// The block menu (click ⋮⋮): turn into, color, duplicate, move, delete.
import type { Editor } from '@tiptap/core';
import { ArrowDown, ArrowUp, Check, Copy, Palette, Repeat2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { COLOR_LABELS, COLORS } from '../colors';
import { deleteBlock, duplicateBlock, moveBlock, selectBlockText, turnInto } from '../blocks';
import type { BlockRef, BlockTypeId } from '../blocks';
import { BLOCK_COLOR_TYPES } from '../extensions/block-color';

export const TURN_INTO_OPTIONS: { id: BlockTypeId; label: string }[] = [
  { id: 'paragraph', label: 'Text' },
  { id: 'heading1', label: 'Heading 1' },
  { id: 'heading2', label: 'Heading 2' },
  { id: 'heading3', label: 'Heading 3' },
  { id: 'bulletList', label: 'Bulleted list' },
  { id: 'orderedList', label: 'Numbered list' },
  { id: 'taskList', label: 'To-do list' },
  { id: 'toggle', label: 'Toggle list' },
  { id: 'quote', label: 'Quote' },
  { id: 'callout', label: 'Callout' },
  { id: 'codeBlock', label: 'Code' }
];

const TEXT_BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'taskItem', 'details', 'blockquote', 'callout', 'codeBlock']);

const shortcut = (mac: string) => <DropdownMenuShortcut>{mac}</DropdownMenuShortcut>;

export function BlockMenu({
  editor,
  block,
  open,
  onOpenChange,
  children
}: {
  editor: Editor;
  block: BlockRef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const name = block.node.type.name;
  const canTurn = TEXT_BLOCKS.has(name);
  const canColor = BLOCK_COLOR_TYPES.includes(name);
  const color = (block.node.attrs.blockColor as string | null) ?? null;

  // Re-read the block at its position: the document may have changed since hover.
  const live = (): BlockRef | null => {
    const node = editor.state.doc.nodeAt(block.pos);
    return node ? { pos: block.pos, node } : null;
  };

  function turn(type: BlockTypeId) {
    const target = live();
    if (!target || !selectBlockText(editor, target)) return;
    turnInto(editor, type);
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        side='left'
        align='start'
        className='w-60'
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          editor.commands.focus(undefined, { scrollIntoView: false });
        }}
      >
        <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>{blockLabel(block)}</DropdownMenuLabel>
        {canTurn ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Repeat2 className='size-4' />
              Turn into
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className='w-52'>
              {TURN_INTO_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.id} onSelect={() => turn(option.id)}>
                  {option.label}
                  {option.id === blockTypeOf(editor, block) ? <Check className='ml-auto size-3.5' /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {canColor ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className='size-4' />
              Color
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className='max-h-96 w-52 overflow-y-auto'>
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Text color</DropdownMenuLabel>
              <ColorItem label='Default text' swatch={<span className='notion-swatch'>A</span>} active={!color} onSelect={() => editor.commands.setBlockColor(block.pos, null)} />
              {COLORS.map((item) => (
                <ColorItem
                  key={item}
                  label={`${COLOR_LABELS[item]} text`}
                  swatch={<span className='notion-swatch' data-text-color={item}>A</span>}
                  active={color === item}
                  onSelect={() => editor.commands.setBlockColor(block.pos, item)}
                />
              ))}
              <DropdownMenuLabel className='text-[12px] font-medium text-muted-foreground'>Background color</DropdownMenuLabel>
              {COLORS.map((item) => (
                <ColorItem
                  key={item}
                  label={`${COLOR_LABELS[item]} background`}
                  swatch={<span className='notion-swatch' data-bg-color={item}>A</span>}
                  active={color === `${item}_background`}
                  onSelect={() => editor.commands.setBlockColor(block.pos, `${item}_background`)}
                />
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        {canTurn || canColor ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem onSelect={() => live() && duplicateBlock(editor, live()!)}>
          <Copy className='size-4' />
          Duplicate
          {shortcut('⌘D')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => live() && moveBlock(editor, live()!, -1)}>
          <ArrowUp className='size-4' />
          Move up
          {shortcut('⌘⇧↑')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => live() && moveBlock(editor, live()!, 1)}>
          <ArrowDown className='size-4' />
          Move down
          {shortcut('⌘⇧↓')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onSelect={() => live() && deleteBlock(editor, live()!)}>
          <Trash2 className='size-4' />
          Delete
          {shortcut('Del')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColorItem({ label, swatch, active, onSelect }: { label: string; swatch: ReactNode; active: boolean; onSelect: () => void }) {
  return (
    <DropdownMenuItem onSelect={onSelect}>
      {swatch}
      {label}
      {active ? <Check className='ml-auto size-3.5' /> : null}
    </DropdownMenuItem>
  );
}

function blockTypeOf(editor: Editor, block: BlockRef): BlockTypeId | null {
  switch (block.node.type.name) {
    case 'paragraph':
      return 'paragraph';
    case 'heading':
      return `heading${block.node.attrs.level}` as BlockTypeId;
    case 'taskItem':
      return 'taskList';
    case 'listItem':
      return editor.state.doc.resolve(block.pos).parent.type.name === 'orderedList' ? 'orderedList' : 'bulletList';
    case 'details':
      return 'toggle';
    case 'blockquote':
      return 'quote';
    case 'callout':
      return 'callout';
    case 'codeBlock':
      return 'codeBlock';
    default:
      return null;
  }
}

const LABELS: Record<string, string> = {
  paragraph: 'Text',
  heading: 'Heading',
  listItem: 'List item',
  taskItem: 'To-do',
  details: 'Toggle',
  blockquote: 'Quote',
  callout: 'Callout',
  codeBlock: 'Code',
  table: 'Table',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  fileBlock: 'File',
  embed: 'Embed',
  bookmark: 'Bookmark',
  pageBlock: 'Page',
  horizontalRule: 'Divider',
  blockMath: 'Equation',
  tableOfContents: 'Table of contents',
  columnList: 'Columns'
};

function blockLabel(block: BlockRef) {
  if (block.node.type.name === 'heading') return `Heading ${block.node.attrs.level}`;
  return LABELS[block.node.type.name] ?? 'Block';
}

