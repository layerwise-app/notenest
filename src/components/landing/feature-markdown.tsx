import { ChevronRight, FileDown, FileUp } from 'lucide-react';
import type * as React from 'react';
import { MockCheckbox, MockWindow } from '~/components/landing/mock-ui';

type Shortcut = { syntax: string; text: string; result: React.ReactNode };

const shortcuts: Shortcut[] = [
  { syntax: '#', text: ' Ideas', result: <span className='text-[18px] font-bold tracking-[-0.01em]'>Ideas</span> },
  {
    syntax: '-',
    text: ' Oat milk',
    result: (
      <span className='flex items-center gap-2'>
        <span className='text-[18px] leading-none'>•</span>Oat milk
      </span>
    )
  },
  { syntax: '1.', text: ' Outline', result: <span className='flex gap-2'>1.<span>Outline</span></span> },
  {
    syntax: '[]',
    text: ' Call the vet',
    result: (
      <span className='flex items-center gap-2'>
        <MockCheckbox checked={false} />
        Call the vet
      </span>
    )
  },
  {
    syntax: '>',
    text: ' Details',
    result: (
      <span className='flex items-center gap-1'>
        <ChevronRight className='size-4 text-foreground/70' />
        Details
      </span>
    )
  },
  { syntax: '"', text: ' Less, but better', result: <span className='border-l-[3px] border-foreground pl-2.5'>Less, but better</span> },
  {
    syntax: '```',
    text: '',
    result: <span className='rounded bg-(--bg-gray) px-2 py-0.5 font-mono text-[12.5px] dark:bg-white/[0.06]'>code block</span>
  },
  { syntax: '**', text: 'bold**', result: <strong className='font-semibold'>bold</strong> },
  {
    syntax: '`',
    text: 'code`',
    result: <code className='rounded bg-(--hover-strong) px-1 py-0.5 font-mono text-[0.85em] text-(--text-red)'>code</code>
  }
];

/** What you type on the left, what the editor turns it into on the right. */
export function MarkdownVisual() {
  return (
    <MockWindow className='text-[14px]'>
      <div className='grid grid-cols-2 border-b border-border px-5 py-2.5 text-[12px] font-medium text-muted-foreground sm:px-7'>
        <span>You type</span>
        <span>You get</span>
      </div>
      <div className='divide-y divide-border px-5 sm:px-7'>
        {shortcuts.map((shortcut) => (
          <div key={shortcut.syntax} className='grid min-h-10 grid-cols-2 items-center gap-4 py-1'>
            <span className='truncate font-mono text-[13px]'>
              <span className='text-primary'>{shortcut.syntax}</span>
              <span className='whitespace-pre text-foreground/80'>{shortcut.text}</span>
            </span>
            <span className='min-w-0'>{shortcut.result}</span>
          </div>
        ))}
      </div>
      <div className='flex flex-wrap items-center gap-2 border-t border-border bg-sidebar px-5 py-3 sm:px-7'>
        <span className='flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 shadow-[inset_0_0_0_1px_var(--border)]'>
          <FileUp className='size-3.5 text-muted-foreground' />
          Import .md
        </span>
        <span className='flex h-7 items-center gap-1.5 rounded-md bg-background px-2.5 shadow-[inset_0_0_0_1px_var(--border)]'>
          <FileDown className='size-3.5 text-muted-foreground' />
          Export .md
        </span>
      </div>
    </MockWindow>
  );
}
