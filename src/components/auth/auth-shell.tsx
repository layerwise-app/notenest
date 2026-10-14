import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { NoteNestLogo } from '~/components/brand';

type AuthShellProps = {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Shared frame for sign-in, sign-up, code entry, and password reset. */
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className='flex min-h-svh flex-col bg-background px-4 text-foreground'>
      <header className='mx-auto flex h-16 w-full max-w-5xl items-center'>
        <Link to='/' aria-label='NoteNest home' className='rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40'>
          <NoteNestLogo />
        </Link>
      </header>
      <main className='flex flex-1 justify-center pt-[9vh] pb-16'>
        <div className='w-full max-w-[380px]'>
          <h1 className='font-serif text-[32px] leading-tight font-medium tracking-[-0.015em]'>{title}</h1>
          {description ? <p className='mt-2 text-[14.5px] text-muted-foreground'>{description}</p> : null}
          <div className='mt-7 rounded-2xl border border-border bg-paper p-6 shadow-[0_1px_2px_rgb(30_26_29/0.04),0_12px_32px_-16px_rgb(30_26_29/0.18)]'>
            {children}
          </div>
          {footer ? <div className='mt-6 text-center text-[13.5px] text-muted-foreground'>{footer}</div> : null}
        </div>
      </main>
    </div>
  );
}

/** Inline form error, announced to screen readers. */
export function FormError({ error }: { error: Error | null }) {
  return error ? (
    <p role='alert' className='text-[13px] text-destructive'>
      {error.message}
    </p>
  ) : null;
}
