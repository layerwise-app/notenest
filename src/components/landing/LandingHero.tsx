import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { WorkspaceShowcase } from '~/components/landing/WorkspaceShowcase';
import { Button } from '~/components/ui/button';

export function LandingHero() {
  return (
    <section className='relative'>
      <div className='mx-auto max-w-4xl px-4 pt-14 pb-12 text-center sm:px-6 sm:pt-24 sm:pb-16'>
        <h1 className='text-[44px] leading-[1.04] font-bold tracking-[-0.035em] text-balance sm:text-[68px] lg:text-[78px]'>
          Write it down.
          <br />
          Nest it anywhere.
        </h1>
        <p className='mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-muted-foreground text-pretty sm:text-[20px]'>
          A calm workspace for notes, docs, and plans.
          <br className='hidden sm:block' /> Start in your browser and sign in when you want sync.
        </p>
        <div className='mt-9 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center'>
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
        <p className='mt-4 text-[13.5px] text-muted-foreground'>No account needed to start.</p>
      </div>
      <div className='relative px-4 pb-20 sm:px-6 sm:pb-28'>
        {/* A soft gray floor under the product shot; decorative. */}
        <div
          aria-hidden='true'
          className='absolute inset-x-0 top-1/3 bottom-0 -z-10 bg-linear-to-b from-transparent via-sidebar to-transparent'
        />
        <WorkspaceShowcase />
      </div>
    </section>
  );
}
