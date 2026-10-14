import { Link } from '@tanstack/react-router';
import type * as React from 'react';
import { NoteNestMark } from '~/components/brand';
import { Button } from '~/components/ui/button';

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <main className='flex min-h-svh flex-col items-center justify-center gap-5 px-4 text-center'>
      <NoteNestMark className='size-10' />
      <div className='space-y-1.5'>
        <h1 className='font-serif text-3xl font-medium'>Page not found</h1>
        <div className='text-muted-foreground'>
          {children || <p>This page doesn’t exist.</p>}
        </div>
      </div>
      <div className='flex gap-2'>
        <Button variant='outline' onClick={() => window.history.back()}>
          Go back
        </Button>
        <Button asChild>
          <Link to='/notes'>Open notes</Link>
        </Button>
      </div>
    </main>
  );
}
