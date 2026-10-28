import {
  Code,
  Columns2,
  Heading1,
  Heading2,
  Image,
  Lightbulb,
  List,
  ListCollapse,
  ListOrdered,
  ListTree,
  Quote,
  Sigma,
  SquareCheck,
  Table,
  Type
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MenuItem, MenuLabel, MockMenu } from '~/components/landing/mock-ui';
import { cn } from '~/lib/utils';

type SlashItem = { label: string; icon: LucideIcon; hint?: string };

const ITEMS: SlashItem[] = [
  { label: 'Text', icon: Type },
  { label: 'To-do list', icon: SquareCheck, hint: '[]' },
  { label: 'Heading 1', icon: Heading1, hint: '#' },
  { label: 'Heading 2', icon: Heading2, hint: '##' },
  { label: 'Bulleted list', icon: List, hint: '-' },
  { label: 'Numbered list', icon: ListOrdered, hint: '1.' },
  { label: 'Toggle list', icon: ListCollapse, hint: '>' },
  { label: 'Quote', icon: Quote, hint: '"' },
  { label: 'Callout', icon: Lightbulb },
  { label: 'Code', icon: Code, hint: '```' },
  { label: 'Table', icon: Table },
  { label: 'Equation', icon: Sigma },
  { label: 'Columns', icon: Columns2 },
  { label: 'Table of contents', icon: ListTree },
  { label: 'Image', icon: Image }
];

type Frame = { query: string; ms: number };

/** Types each word one letter at a time, holds on the result, then clears. */
function typingFrames(words: string[]): Frame[] {
  return words.flatMap((word) => [
    { query: '', ms: 1100 },
    ...[...word].map((_, index) => ({
      query: word.slice(0, index + 1),
      ms: index === word.length - 1 ? 1700 : 160
    }))
  ]);
}

const FRAMES = typingFrames(['cal', 'cod', 'tab', 'tog']);

function matches(item: SlashItem, query: string) {
  return item.label
    .toLowerCase()
    .split(/[\s-]+/)
    .some((word) => word.startsWith(query));
}

/** Steps through the frames on a timer; stays on the first frame for reduced motion. */
function useTypingLoop() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % FRAMES.length), FRAMES[index].ms);
    return () => window.clearTimeout(timer);
  }, [index]);
  return FRAMES[index].query;
}

/** A page line with "/" typed and the block menu filtering below it. */
export function SlashDemo({ className }: { className?: string }) {
  const query = useTypingLoop();
  // Unfiltered, show a few suggestions so the menu fits inside the mock window.
  const items = query ? ITEMS.filter((item) => matches(item, query)) : ITEMS.slice(0, 3);

  return (
    <div className={cn('relative', className)}>
      <div className='flex h-[30px] items-center'>
        <span>/{query}</span>
        <span className='nn-caret' />
        {query ? null : <span className='ml-1 text-muted-foreground/70'>Type to filter…</span>}
      </div>
      <MockMenu key={query === '' ? 'all' : 'filtered'} className='nn-rise absolute top-full left-0 z-10 mt-1 w-[264px]'>
        {query ? null : <MenuLabel>Basic blocks</MenuLabel>}
        {items.map((item, index) => (
          <MenuItem key={item.label} icon={item.icon} label={item.label} hint={item.hint} active={index === 0} />
        ))}
      </MockMenu>
    </div>
  );
}
