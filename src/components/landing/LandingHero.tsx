import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { NotebookShowcase } from '~/components/landing/NotebookShowcase';
import { Button } from '~/components/ui/button';

export function LandingHero() {
  return (
    <section className='relative overflow-hidden'>
      {/* A faint plum glow behind the product shot; purely decorative. */}
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 top-[38%] -z-10 mx-auto h-[620px] max-w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgb(122_46_107/0.10),transparent)] blur-2xl'
      />
      <div className='mx-auto max-w-6xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-16'>
        <h1 className='mx-auto max-w-3xl font-serif text-[42px] leading-[1.04] font-medium tracking-[-0.025em] text-balance sm:text-[64px] lg:text-[76px]'>
          Write in Markdown.
          <br />
          Think in <em className='text-primary italic'>links</em>.
        </h1>
        <p className='mx-auto mt-6 max-w-[34rem] text-[17px] leading-relaxed text-muted-foreground text-pretty sm:text-[18px]'>
          Tags, backlinks, and checklists in a calm notebook that works offline and syncs when
          you sign in.
        </p>
        <div className='mt-9 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center'>
          <Button asChild className='h-11 rounded-lg px-5 text-[15px] hover:bg-primary/90'>
            <Link to='/notes'>
              Start writing
              <ArrowRight className='size-4' />
            </Link>
          </Button>
          <Button asChild variant='outline' className='h-11 rounded-lg bg-paper px-5 text-[15px]'>
            <Link to='/sign-in'>Sign in</Link>
          </Button>
        </div>
      </div>
      <div className='px-4 pb-20 sm:px-6 sm:pb-28'>
        <NotebookShowcase />
      </div>
    </section>
  );
}
