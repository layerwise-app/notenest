import {
  Baseline,
  Bold,
  Check,
  ChevronDown,
  Code,
  Columns2,
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Italic,
  Lightbulb,
  Link,
  List,
  ListCollapse,
  ListTree,
  Palette,
  Plus,
  Quote,
  Repeat2,
  Search,
  Sigma,
  SquareCheck,
  Strikethrough,
  Table,
  Trash2,
  Type,
  Underline
} from 'lucide-react';
import type * as React from 'react';
import { DateMention, MenuItem, MenuLabel, MockMenu, MockWindow, PageMention } from '~/components/landing/mock-ui';
import { cn } from '~/lib/utils';

/** A page using the advanced blocks, with the / menu open on the last line. */
export function BlocksVisual() {
  return (
    <div className='relative pb-28 sm:pb-24'>
      <MockWindow className='overflow-visible px-5 py-6 text-[14.5px] sm:px-9 sm:py-8'>
        <div className='text-[22px] font-bold tracking-[-0.015em]'>🏯 Kyoto trip</div>
        <div className='mt-3 grid gap-1 text-muted-foreground'>
          <span className='underline decoration-foreground/20 underline-offset-4'>Getting there</span>
          <span className='pl-4 underline decoration-foreground/20 underline-offset-4'>Where to stay</span>
          <span className='underline decoration-foreground/20 underline-offset-4'>Budget</span>
        </div>

        <div className='mt-5 grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]'>
          <table className='w-full border-collapse text-[13.5px]'>
            <tbody>
              {[
                ['Item', 'Cost'],
                ['Flights', '$840'],
                ['Ryokan, 3 nights', '$620'],
                ['Rail pass', '$210']
              ].map(([item, cost], row) => (
                <tr key={item} className={row === 0 ? 'bg-(--bg-gray)/70 font-medium dark:bg-white/[0.04]' : undefined}>
                  <td className='border border-border px-2.5 py-1.5'>{item}</td>
                  <td className='border border-border px-2.5 py-1.5 tabular-nums'>{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className='py-2 text-center font-serif text-[22px]'>
            <i>T</i> = <span className='text-[26px]'>∑</span>
            <sub className='text-[13px]'>
              <i>i</i>
            </sub>{' '}
            <i>c</i>
            <sub className='text-[13px]'>
              <i>i</i>
            </sub>{' '}
            = $1,670
          </div>
        </div>

        <blockquote className='mt-5 border-l-[3px] border-foreground pl-3.5'>Pack light. Leave room for books.</blockquote>
        <p className='mt-4 leading-7'>
          Flights land <DateMention>Nov 20</DateMention>. Day plans live in{' '}
          <PageMention icon='🗺️'>Itinerary</PageMention> 🍵
        </p>
        <div className='relative mt-1 flex h-7 items-center'>
          /<span className='nn-caret' />
          <MockMenu className='absolute top-full left-0 z-10 mt-1 w-[236px]'>
            <MenuLabel>Advanced blocks</MenuLabel>
            <MenuItem icon={Table} label='Table' active />
            <MenuItem icon={Sigma} label='Equation' />
            <MenuItem icon={Columns2} label='Columns' />
            <MenuItem icon={ListTree} label='Table of contents' />
          </MockMenu>
        </div>
      </MockWindow>
    </div>
  );
}

/** A hovered block with its menu open, plus the toolbar over a selection. */
export function EditingVisual() {
  return (
    <MockWindow className='px-5 pt-6 pb-8 text-[15px] sm:pr-8 sm:pb-28 sm:pl-16'>
      <div className='text-[22px] font-bold tracking-[-0.015em]'>📣 Launch notes</div>
      <FormatToolbar className='mt-4' />
      <p className='mt-2 leading-7'>
        Homepage copy is <span className='bg-[rgb(35_131_226/0.28)]'>final as of Monday</span>. Pricing still
        needs a pass.
      </p>
      <p className='mt-2 leading-7'>
        <span className='font-medium text-(--text-red)'>Due Friday:</span>{' '}
        <span className='rounded-sm bg-(--bg-yellow) px-0.5'>check the pricing table</span> before handoff.
      </p>

      <div className='relative mt-2'>
        <div className='-ml-1 rounded-md bg-(--hover) py-1 pl-1'>
          <span className='absolute top-[17px] -left-12 hidden -translate-y-1/2 items-center gap-0.5 text-muted-foreground sm:flex'>
            <Plus className='size-4' />
            <span className='grid h-6 w-[18px] place-items-center rounded bg-(--hover-strong)'>
              <GripVertical className='size-4' />
            </span>
          </span>
          <Bullet>Draft the launch email</Bullet>
        </div>
        <div className='absolute top-full left-0 z-10 mt-1 flex items-start gap-1'>
          <MockMenu className='w-[200px]'>
            <div className='mb-1 flex h-7 items-center gap-2 rounded-md px-2 text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]'>
              <Search className='size-3.5' />
              Search actions…
            </div>
            <MenuItem icon={Repeat2} label='Turn into' submenu active />
            <MenuItem icon={Palette} label='Color' submenu />
            <MenuItem icon={Copy} label='Duplicate' hint='⌘D' />
            <MenuItem icon={Trash2} label='Delete' hint='Del' />
          </MockMenu>
          <MockMenu className='mt-8 hidden w-[184px] sm:block'>
            <MenuItem icon={Type} label='Text' />
            <MenuItem icon={Heading1} label='Heading 1' />
            <MenuItem icon={Heading2} label='Heading 2' />
            <MenuItem icon={List} label={<CurrentType>Bulleted list</CurrentType>} />
            <MenuItem icon={SquareCheck} label='To-do list' active />
            <MenuItem icon={ListCollapse} label='Toggle list' />
            <MenuItem icon={Lightbulb} label='Callout' />
            <MenuItem icon={Quote} label='Quote' />
          </MockMenu>
        </div>
      </div>
      <div className='mt-1 pl-0.5'>
        <Bullet>Schedule social posts</Bullet>
        <Bullet>Update the press kit</Bullet>
      </div>
      <div className='mt-3 flex gap-2.5 rounded-md bg-(--bg-blue) px-3.5 py-3 leading-6'>
        <span>📌</span>
        Press embargo lifts at 9 AM on launch day.
      </div>
      <p className='mt-3 leading-7'>Final review with the whole team on Thursday.</p>
    </MockWindow>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex h-7 items-center gap-2.5 pl-1'>
      <span className='text-[18px] leading-none'>•</span>
      {children}
    </div>
  );
}

function CurrentType({ children }: { children: React.ReactNode }) {
  return (
    <span className='inline-flex items-center gap-2'>
      {children}
      <Check className='size-3.5 text-muted-foreground' />
    </span>
  );
}

function FormatToolbar({ className }: { className?: string }) {
  const icons = [Bold, Italic, Underline, Strikethrough, Code, Link];
  return (
    <div className={className}>
      <div className='inline-flex h-9 items-center gap-0.5 rounded-lg bg-popover px-1 text-[14px] shadow-(--menu-shadow)'>
        <span className='flex h-7 items-center gap-1 rounded-md px-2'>
          Text <ChevronDown className='size-3.5 text-muted-foreground' />
        </span>
        <span className='mx-0.5 h-5 w-px bg-border' />
        {icons.map((Icon, index) => (
          <span
            key={index}
            className={cn(
              'grid size-7 place-items-center rounded-md text-foreground/80',
              (Icon === Strikethrough || Icon === Code) && 'hidden sm:grid'
            )}
          >
            <Icon className='size-4' strokeWidth={index === 0 ? 2.5 : 2} />
          </span>
        ))}
        <span className='mx-0.5 h-5 w-px bg-border' />
        <span className='flex h-7 items-center gap-0.5 rounded-md bg-(--hover) px-1.5'>
          <Baseline className='size-4 text-(--text-red)' />
          <ChevronDown className='size-3.5 text-muted-foreground' />
        </span>
      </div>
    </div>
  );
}
