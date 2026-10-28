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
      <header className='mx-auto flex h-14 w-full max-w-6xl items-center'>
        <Link to='/' aria-label='NoteNest home' className='rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40'>
          <NoteNestLogo />
        </Link>
      </header>
      <main className='flex flex-1 justify-center pt-[10vh] pb-16'>
        <div className='w-full max-w-[340px]'>
          <h1 className='text-center text-[28px] leading-tight font-bold tracking-[-0.025em] text-balance'>{title}</h1>
          {description ? (
            <p className='mt-2 text-center text-[15px] text-muted-foreground text-pretty'>{description}</p>
          ) : null}
          <div className='mt-8'>{children}</div>
          {footer ? (
            <div className='mt-8 border-t border-border pt-5 text-center text-[13.5px] text-muted-foreground'>{footer}</div>
          ) : null}
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
