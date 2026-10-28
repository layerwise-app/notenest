import { Search } from 'lucide-react';
import type * as React from 'react';
import { MenuLabel, MockKbd, MockMenu } from '~/components/landing/mock-ui';
import { cn } from '~/lib/utils';

/** Two smaller features side by side: ⌘K search and page style options. */
export function SearchAndStyle() {
  return (
    <section aria-label='Search and style' className='mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20'>
      <div className='grid gap-5 lg:grid-cols-2'>
        <Card
          id='search-title'
          title='Find any page with ⌘K.'
          body='Search everything and jump straight to the page you need.'
        >
          <SearchMock />
        </Card>
        <Card
          id='style-title'
          title='Make each page your own.'
          body='Light or dark. Default, serif, or mono. Full width or small text, page by page.'
        >
          <StyleMock />
        </Card>
      </div>
    </section>
  );
}

function Card({ id, title, body, children }: { id: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <article aria-labelledby={id} className='flex flex-col rounded-2xl bg-(--bg-gray) p-6 sm:p-9 dark:bg-card'>
      <h2 id={id} className='text-[26px] leading-tight font-bold tracking-[-0.025em] text-balance sm:text-[30px]'>
        {title}
      </h2>
      <p className='mt-2.5 max-w-md text-[16px] leading-relaxed text-muted-foreground'>{body}</p>
      <div aria-hidden='true' className='mt-8 flex flex-1 items-end select-none'>
        {children}
      </div>
    </article>
  );
}

function SearchMock() {
  const results = [
    { icon: '✈️', title: 'Kyoto trip', path: 'Pages' },
    { icon: '🗺️', title: 'Kyoto itinerary', path: 'Kyoto trip' },
    { icon: '🍜', title: 'Kyoto food list', path: 'Kyoto trip' }
  ];
  return (
    <MockMenu className='w-full p-0'>
      <div className='flex h-12 items-center gap-2.5 border-b border-border px-4 text-[15px]'>
        <Search className='size-4 text-muted-foreground' />
        <span>
          kyo<span className='nn-caret' />
        </span>
        <MockKbd className='ml-auto'>esc</MockKbd>
      </div>
      <div className='p-1.5'>
        <MenuLabel>Pages</MenuLabel>
        {results.map((result, index) => (
          <div
            key={result.title}
            className={cn('flex h-9 items-center gap-2.5 rounded-md px-2', index === 0 && 'bg-(--hover)')}
          >
            <span>{result.icon}</span>
            <span className='truncate'>{result.title}</span>
            <span className='truncate text-[12.5px] text-muted-foreground'>— {result.path}</span>
            {index === 0 ? <span className='ml-auto text-[12px] text-muted-foreground'>↵</span> : null}
          </div>
        ))}
      </div>
      <div className='flex gap-4 border-t border-border px-4 py-2 text-[12px] text-muted-foreground'>
        <span>↑↓ Select</span>
        <span>↵ Open</span>
      </div>
    </MockMenu>
  );
}

const fonts = [
  { label: 'Default', className: 'font-sans' },
  { label: 'Serif', className: 'font-serif' },
  { label: 'Mono', className: 'font-mono' }
];

function StyleMock() {
  return (
    <MockMenu className='w-full p-2'>
      <MenuLabel>Style</MenuLabel>
      <div className='grid grid-cols-3 gap-1 px-1'>
        {fonts.map((font) => (
          <div
            key={font.label}
            className={cn(
              'grid place-items-center gap-0.5 rounded-md py-2.5',
              font.label === 'Serif' ? 'text-primary' : 'text-foreground'
            )}
          >
            <span className={cn('text-[26px] leading-none', font.className)}>Ag</span>
            <span className='text-[12px] text-muted-foreground'>{font.label}</span>
          </div>
        ))}
      </div>
      <div className='my-1.5 h-px bg-border' />
      <ToggleRow label='Small text' on={false} />
      <ToggleRow label='Full width' on />
    </MockMenu>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div className='flex h-9 items-center px-2'>
      {label}
      <span
        className={cn(
          'relative ml-auto h-[18px] w-[30px] rounded-full transition-colors',
          on ? 'bg-primary' : 'bg-foreground/20'
        )}
      >
        <span
          className={cn('absolute top-[2px] size-[14px] rounded-full bg-white shadow-sm', on ? 'left-[14px]' : 'left-[2px]')}
        />
      </span>
    </div>
  );
}
