import { Check, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { cn } from '~/lib/utils';

// Small static pieces that mirror the workspace UI inside landing mocks.

/** A framed surface for a product mock: an app window or a page. */
export function MockWindow({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-background shadow-[0_1px_2px_rgb(15_15_15/0.04),0_18px_44px_-14px_rgb(15_15_15/0.18)] dark:shadow-[0_18px_44px_-14px_rgb(0_0_0/0.7)]',
        className
      )}
    >
      {children}
    </div>
  );
}

/** A floating menu, styled like the workspace's popovers. */
export function MockMenu({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-[10px] bg-popover p-1 text-[14px] text-popover-foreground shadow-(--menu-shadow)',
        className
      )}
    >
      {children}
    </div>
  );
}

export function MenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-2 pt-2 pb-1 text-[12px] font-medium text-muted-foreground', className)}>
      {children}
    </div>
  );
}

type MenuItemProps = {
  icon?: LucideIcon;
  label: React.ReactNode;
  /** Muted text on the right, like a shortcut. */
  hint?: React.ReactNode;
  active?: boolean;
  submenu?: boolean;
  className?: string;
};

export function MenuItem({ icon: Icon, label, hint, active, submenu, className }: MenuItemProps) {
  return (
    <div
      className={cn(
        'flex h-7 items-center gap-2 rounded-md px-2 whitespace-nowrap',
        active && 'bg-(--hover)',
        className
      )}
    >
      {Icon ? <Icon className='size-4 shrink-0 text-foreground/80' strokeWidth={1.75} /> : null}
      <span className='min-w-0 truncate'>{label}</span>
      {hint ? <span className='ml-auto pl-3 text-[12px] text-muted-foreground'>{hint}</span> : null}
      {submenu ? <ChevronRight className='ml-auto size-3.5 text-muted-foreground' /> : null}
    </div>
  );
}

export function MockCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px]',
        checked ? 'border-primary bg-primary text-white' : 'border-foreground/60'
      )}
    >
      {checked ? <Check className='size-3' strokeWidth={3} /> : null}
    </span>
  );
}

export function MockTodo({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <div className='flex min-h-[30px] items-center gap-2.5 py-0.5'>
      <MockCheckbox checked={checked} />
      <span
        className={cn(
          'min-w-0 truncate',
          checked && 'text-muted-foreground line-through decoration-foreground/30'
        )}
      >
        {children}
      </span>
    </div>
  );
}

export function MockKbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[11px] font-medium text-muted-foreground',
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** An inline page mention: icon plus underlined title. */
export function PageMention({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className='whitespace-nowrap'>
      <span className='mr-0.5'>{icon}</span>
      <span className='font-medium underline decoration-foreground/25 underline-offset-[3px]'>
        {children}
      </span>
    </span>
  );
}

export function DateMention({ children }: { children: React.ReactNode }) {
  return <span className='whitespace-nowrap text-muted-foreground'>@{children}</span>;
}

/** A sidebar row: chevron, emoji or icon, title. */
export function SidebarRow({
  icon,
  label,
  depth = 0,
  expanded,
  active,
  trailing,
  className
}: {
  icon: React.ReactNode;
  label: string;
  depth?: number;
  /** Pages show a chevron; plain rows (Search, Trash) pass undefined. */
  expanded?: boolean;
  active?: boolean;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[30px] items-center gap-1.5 rounded-md pr-2 text-[14px]',
        active && 'bg-(--hover) font-medium text-foreground',
        className
      )}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      {expanded === undefined ? null : (
        <ChevronRight
          className={cn('size-3.5 shrink-0 text-muted-foreground', expanded && 'rotate-90')}
        />
      )}
      <span className='grid w-5 shrink-0 place-items-center text-[15px] leading-none'>{icon}</span>
      <span className='min-w-0 truncate'>{label}</span>
      {trailing ? <span className='ml-auto'>{trailing}</span> : null}
    </div>
  );
}

export function SidebarLabel({ children }: { children: React.ReactNode }) {
  return <div className='px-2 pt-4 pb-1 text-[12px] font-medium text-muted-foreground'>{children}</div>;
}

/** A CSS-drawn landscape that stands in for an uploaded image. */
export function MockPhoto({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-[linear-gradient(180deg,#cfe3f3_0%,#f5e6d6_70%)] dark:brightness-75',
        className
      )}
    >
      <span className='absolute top-[16%] right-[22%] aspect-square w-[16%] rounded-full bg-[#f7c98b] blur-[0.5px]' />
      <span className='absolute -bottom-[38%] -left-[10%] h-[80%] w-[75%] rounded-[50%] bg-[#9cc29a]' />
      <span className='absolute -right-[15%] -bottom-[45%] h-[85%] w-[80%] rounded-[50%] bg-[#7aab83]' />
      <span className='absolute -bottom-[60%] left-[20%] h-[80%] w-[70%] rounded-[50%] bg-[#5f9470]' />
    </div>
  );
}
