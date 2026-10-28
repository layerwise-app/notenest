import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { NoteNestLogo, NoteNestMark } from '~/components/brand';
import { PoweredByLayerwise } from '~/components/powered-by-layerwise';
import { Button } from '~/components/ui/button';

export function FinalCta() {
  return (
    <section aria-labelledby='final-cta-title' className='px-4 py-24 sm:px-6 sm:py-32'>
      <div className='mx-auto flex max-w-2xl flex-col items-center text-center'>
        <NoteNestMark className='size-12' />
        <h2
          id='final-cta-title'
          className='mt-6 text-[38px] leading-[1.06] font-bold tracking-[-0.03em] text-balance sm:text-[56px]'
        >
          Start your first page.
        </h2>
        <p className='mt-4 text-[17px] text-muted-foreground'>No account needed. Sign in later to sync.</p>
        <div className='mt-8 flex w-full flex-col items-stretch justify-center gap-2.5 sm:w-auto sm:flex-row sm:items-center'>
          <Button asChild className='h-11 rounded-lg px-5 text-[15px] hover:bg-primary/90'>
            <Link to='/notes'>
              Start writing
              <ArrowRight className='size-4' />
            </Link>
          </Button>
          <Button asChild variant='outline' className='h-11 rounded-lg px-5 text-[15px]'>
            <Link to='/sign-in'>Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className='border-t border-border'>
      <div className='mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8 text-[14px] text-muted-foreground sm:flex-row sm:items-center sm:px-6'>
        <div className='flex items-center gap-3'>
          <NoteNestLogo className='[&_svg]:size-6 [&>span:last-child]:text-[15px]' />
          <span>© 2026</span>
        </div>
        <nav aria-label='Footer' className='flex gap-5 sm:ml-auto'>
          <Link to='/notes' className='hover:text-foreground'>
            Open NoteNest
          </Link>
          <Link to='/sign-in' className='hover:text-foreground'>
            Sign in
          </Link>
          <Link to='/sign-up' className='hover:text-foreground'>
            Create account
          </Link>
        </nav>
        <div className='sm:ml-4'>
          <PoweredByLayerwise />
        </div>
      </div>
    </footer>
  );
}
