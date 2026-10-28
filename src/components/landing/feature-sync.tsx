import { CloudCheck, WifiOff } from 'lucide-react';
import type * as React from 'react';
import { MockTodo, MockWindow } from '~/components/landing/mock-ui';

const todos = [
  { text: 'Book the ryokan', done: true },
  { text: 'Buy a rail pass', done: true },
  { text: 'Reserve the tea ceremony', done: false },
  { text: 'Download offline maps', done: false }
];

/** The same page in a browser that's offline and on a phone that's synced. */
export function SyncVisual() {
  return (
    <div className='relative pr-10 pb-16 sm:pr-24 sm:pb-10'>
      <MockWindow className='text-[14.5px]'>
        <div className='flex h-10 items-center gap-2 border-b border-border px-4'>
          <span className='flex gap-1.5'>
            <span className='size-2.5 rounded-full bg-foreground/15' />
            <span className='size-2.5 rounded-full bg-foreground/15' />
            <span className='size-2.5 rounded-full bg-foreground/15' />
          </span>
          <span className='ml-2 truncate text-[13px]'>✈️ Kyoto trip</span>
          <StatusPill icon={<WifiOff className='size-3.5' />} label='Offline, saved here' />
        </div>
        <div className='px-5 pt-5 pb-8 sm:px-8 sm:pt-6'>
          <div className='text-[22px] font-bold tracking-[-0.015em]'>✈️ Kyoto trip</div>
          <div className='mt-2'>
            {todos.map((todo) => (
              <MockTodo key={todo.text} checked={todo.done}>
                {todo.text}
              </MockTodo>
            ))}
          </div>
        </div>
      </MockWindow>

      <div className='absolute right-0 bottom-0 w-[176px] rounded-[26px] border-[5px] border-[#2b2b2b] bg-background text-[12.5px] shadow-[0_18px_40px_-12px_rgb(15_15_15/0.35)] sm:w-[200px] dark:border-[#3a3a3a]'>
        <div className='flex items-center justify-between px-4 pt-2 text-[10px] font-semibold'>
          <span>9:41</span>
          <span className='h-3 w-10 rounded-full bg-[#2b2b2b] dark:bg-[#3a3a3a]' />
          <span>100%</span>
        </div>
        <div className='flex h-8 items-center px-3'>
          <StatusPill icon={<CloudCheck className='size-3.5' />} label='Synced' />
        </div>
        <div className='px-3.5 pb-5'>
          <div className='text-[16px] font-bold tracking-[-0.01em]'>✈️ Kyoto trip</div>
          <div className='mt-1 [&>div]:min-h-[26px]'>
            {todos.map((todo) => (
              <MockTodo key={todo.text} checked={todo.done}>
                {todo.text}
              </MockTodo>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className='ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-(--hover) px-2 py-0.5 text-[11.5px] text-muted-foreground'>
      {icon}
      {label}
    </span>
  );
}
