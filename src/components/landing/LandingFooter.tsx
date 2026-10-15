import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { NoteNestLogo } from '~/components/brand';
import { PoweredByLayerwise } from '~/components/powered-by-layerwise';
import { Button } from '~/components/ui/button';

export function FinalCta() {
  return (
    <section aria-labelledby='final-cta-title' className='px-4 py-24 sm:px-6 sm:py-32'>
      <div className='mx-auto max-w-2xl text-center'>
        <h2
          id='final-cta-title'
          className='font-serif text-[38px] leading-[1.08] font-medium tracking-[-0.02em] text-balance sm:text-[56px]'
        >
          Your next note starts here.
        </h2>
        <Button asChild className='mt-9 h-11 rounded-lg px-5 text-[15px] hover:bg-primary/90'>
          <Link to='/notes'>
            Start writing
            <ArrowRight className='size-4' />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className='border-t border-border'>
      <div className='mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-[13.5px] text-muted-foreground sm:flex-row sm:items-center sm:px-6'>
        <NoteNestLogo className='[&_svg]:size-6' />
        <span className='sm:ml-3'>© 2026 NoteNest</span>
        <nav aria-label='Footer' className='flex gap-5 sm:ml-auto'>
          <Link to='/notes' className='hover:text-foreground'>
            Open notes
          </Link>
          <Link to='/sign-in' className='hover:text-foreground'>
            Sign in
          </Link>
        </nav>
      </div>
      <div className='mx-auto flex max-w-6xl justify-center px-4 pb-8 sm:px-6'>
        <PoweredByLayerwise />
      </div>
    </footer>
  );
}
