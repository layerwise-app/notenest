import { Link } from '@tanstack/react-router';
import { NoteNestLogo } from '~/components/brand';
import { Button } from '~/components/ui/button';

const sections = [
  { href: '#links', label: 'Links' },
  { href: '#tags', label: 'Tags' },
  { href: '#modes', label: 'Writing' }
];

export function LandingNav() {
  return (
    <header className='sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/70'>
      <nav
        aria-label='Main'
        className='mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6'
      >
        <Link
          to='/'
          aria-label='NoteNest home'
          className='rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none'
        >
          <NoteNestLogo />
        </Link>
        <div className='hidden items-center gap-1 md:flex'>
          {sections.map((section) => (
            <a
              key={section.href}
              href={section.href}
              className='rounded-md px-2.5 py-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none'
            >
              {section.label}
            </a>
          ))}
        </div>
        <div className='ml-auto flex items-center gap-1.5'>
          <Button asChild variant='ghost' className='h-9 px-3 text-[14px]'>
            <Link to='/sign-in'>Sign in</Link>
          </Button>
          <Button asChild className='h-9 rounded-lg px-3.5 text-[14px] hover:bg-primary/90'>
            <Link to='/notes'>Start writing</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
