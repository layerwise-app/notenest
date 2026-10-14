import {
  Bold,
  Brackets,
  ChevronDown,
  Code,
  Heading,
  Highlighter,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  SquareCode,
  Strikethrough,
  TextQuote
} from 'lucide-react';
import type * as React from 'react';
import { FORMAT_COMMANDS } from '~/components/notes/editor-commands';
import type { FormatCommandId } from '~/components/notes/editor-commands';
import { IconButton } from '~/components/notes/note-ui';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

type ToolbarProps = {
  onFormat: (command: FormatCommandId) => void;
  onWikiLink: () => void;
  className?: string;
};

const GROUPS: [FormatCommandId, React.ComponentType<{ className?: string }>][][] = [
  [
    ['bold', Bold],
    ['italic', Italic],
    ['strike', Strikethrough],
    ['highlight', Highlighter],
    ['code', Code]
  ],
  [
    ['bullet', List],
    ['numbered', ListOrdered],
    ['task', ListChecks],
    ['quote', TextQuote],
    ['codeblock', SquareCode]
  ],
  [['link', Link]]
];

const HEADINGS: FormatCommandId[] = ['h1', 'h2', 'h3'];

export function EditorToolbar({ onFormat, onWikiLink, className }: ToolbarProps) {
  // Buttons keep focus in the textarea so the selection survives the click.
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div
      role='toolbar'
      aria-label='Formatting'
      className={cn('flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]', className)}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            aria-label='Heading'
            onMouseDown={keepSelection}
            className='gap-0.5 px-2 text-muted-foreground hover:text-foreground'
          >
            <Heading className='size-4' />
            <ChevronDown className='size-3 opacity-60' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-48' onCloseAutoFocus={(event) => event.preventDefault()}>
          {HEADINGS.map((id, index) => (
            <DropdownMenuItem key={id} onSelect={() => onFormat(id)}>
              <span
                className={cn(
                  'font-serif font-semibold',
                  index === 0 ? 'text-[17px]' : index === 1 ? 'text-[15.5px]' : 'text-[14px]'
                )}
              >
                {FORMAT_COMMANDS[id].label}
              </span>
              <DropdownMenuShortcut>{FORMAT_COMMANDS[id].keys}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {GROUPS.map((group, index) => (
        <div key={index} className='flex items-center gap-0.5'>
          <span aria-hidden='true' className='mx-1 h-4 w-px shrink-0 bg-border' />
          {group.map(([id, Icon]) => (
            <IconButton
              key={id}
              label={FORMAT_COMMANDS[id].label}
              shortcut={FORMAT_COMMANDS[id].keys}
              onMouseDown={keepSelection}
              onClick={() => onFormat(id)}
            >
              <Icon className='size-4' />
            </IconButton>
          ))}
        </div>
      ))}
      <IconButton label='Link to note' shortcut='[[' onMouseDown={keepSelection} onClick={onWikiLink}>
        <Brackets className='size-4' />
      </IconButton>
    </div>
  );
}
