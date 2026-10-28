import { Check, CloudCheck, FolderTree, GripVertical, Hash, Image, SquareSlash } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { BlocksVisual, EditingVisual } from '~/components/landing/feature-blocks';
import { MarkdownVisual } from '~/components/landing/feature-markdown';
import { MediaVisual } from '~/components/landing/feature-media';
import { PagesVisual } from '~/components/landing/feature-pages';
import { SyncVisual } from '~/components/landing/feature-sync';
import { cn } from '~/lib/utils';

// Class names are spelled out so Tailwind can find them. Dark panels are softened so
// the saturated dark tints don't overpower the mocks.
const TONES = {
  blue: { tile: 'bg-(--bg-blue) text-(--text-blue)', panel: 'bg-(--bg-blue) dark:bg-(--bg-blue)/55', check: 'text-(--text-blue)' },
  purple: { tile: 'bg-(--bg-purple) text-(--text-purple)', panel: 'bg-(--bg-purple) dark:bg-(--bg-purple)/55', check: 'text-(--text-purple)' },
  orange: { tile: 'bg-(--bg-orange) text-(--text-orange)', panel: 'bg-(--bg-orange) dark:bg-(--bg-orange)/55', check: 'text-(--text-orange)' },
  green: { tile: 'bg-(--bg-green) text-(--text-green)', panel: 'bg-(--bg-green) dark:bg-(--bg-green)/55', check: 'text-(--text-green)' },
  pink: { tile: 'bg-(--bg-pink) text-(--text-pink)', panel: 'bg-(--bg-pink) dark:bg-(--bg-pink)/55', check: 'text-(--text-pink)' },
  yellow: { tile: 'bg-(--bg-yellow) text-(--text-yellow)', panel: 'bg-(--bg-yellow) dark:bg-(--bg-yellow)/55', check: 'text-(--text-yellow)' }
} as const;

type Feature = {
  id: string;
  tone: keyof typeof TONES;
  icon: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  points?: string[];
  visual: React.ReactNode;
};

const features: Feature[] = [
  {
    id: 'blocks',
    tone: 'blue',
    icon: SquareSlash,
    eyebrow: 'Blocks',
    title: 'Type / to add any block.',
    body: 'Every line is a block. Pick text, lists, toggles, callouts, code, and more from one menu.',
    points: [
      'Code blocks with syntax highlighting',
      'Tables, equations, columns, and a table of contents',
      'Type @ to mention a page or date, and : for emoji'
    ],
    visual: <BlocksVisual />
  },
  {
    id: 'editing',
    tone: 'purple',
    icon: GripVertical,
    eyebrow: 'Editing',
    title: 'Move and restyle any block.',
    body: 'Grab the handle to drag a block anywhere on the page. Select text and a formatting toolbar appears.',
    points: ['Turn any block into another type', 'Block colors and backgrounds', 'Text colors and highlights'],
    visual: <EditingVisual />
  },
  {
    id: 'media',
    tone: 'orange',
    icon: Image,
    eyebrow: 'Media',
    title: 'Drop in images, video, and files.',
    body: 'Upload or paste images, video, audio, and files right into the page.',
    points: ['Embed YouTube, Figma, Loom, maps, and more', 'Paste a link to get a bookmark with a preview'],
    visual: <MediaVisual />
  },
  {
    id: 'pages',
    tone: 'green',
    icon: FolderTree,
    eyebrow: 'Pages',
    title: 'Pages inside pages.',
    body: 'Nest pages as deep as you like. Give each one an emoji icon and a cover.',
    points: [
      'Drag pages to reorder them in the sidebar',
      'Star the pages you open most',
      'Restore deleted pages from Trash'
    ],
    visual: <PagesVisual />
  },
  {
    id: 'markdown',
    tone: 'pink',
    icon: Hash,
    eyebrow: 'Markdown',
    title: 'Markdown shortcuts as you type.',
    body: (
      <>
        Type <Syntax>#</Syntax> for a heading or <Syntax>[]</Syntax> for a to-do. Paste Markdown and it formats
        itself.
      </>
    ),
    points: ['Shortcuts for lists, toggles, quotes, and code', 'Import and export .md files'],
    visual: <MarkdownVisual />
  },
  {
    id: 'sync',
    tone: 'yellow',
    icon: CloudCheck,
    eyebrow: 'Offline and sync',
    title: (
      <>
        Works offline.
        <br />
        Syncs when you <span className='whitespace-nowrap'>sign in.</span>
      </>
    ),
    body: 'Start writing with no account. Pages save in this browser, even offline. Sign in to open them on any device.',
    visual: <SyncVisual />
  }
];

/** Feature sections; `slot` renders between two of them (after `slotAfter`). */
export function FeatureSections({ slot, slotAfter }: { slot?: React.ReactNode; slotAfter?: string }) {
  return (
    <div>
      {features.map((feature, index) => (
        <div key={feature.id}>
          <FeatureSection feature={feature} reversed={index % 2 === 1} />
          {feature.id === slotAfter ? slot : null}
        </div>
      ))}
    </div>
  );
}

function Syntax({ children }: { children: React.ReactNode }) {
  return <code className='rounded bg-(--hover-strong) px-1 py-0.5 font-mono text-[0.85em] text-foreground'>{children}</code>;
}

function FeatureSection({ feature, reversed }: { feature: Feature; reversed: boolean }) {
  const tone = TONES[feature.tone];
  const Icon = feature.icon;
  const headingId = `${feature.id}-title`;
  return (
    <section id={feature.id} aria-labelledby={headingId} className='scroll-mt-14'>
      <div className='mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-14 lg:py-24'>
        <div className={cn('lg:col-span-5', reversed && 'lg:order-2 lg:col-start-8')}>
          <p className='inline-flex items-center gap-2.5 text-[15px] font-medium'>
            <span className={cn('grid size-7 place-items-center rounded-md', tone.tile)}>
              <Icon className='size-4' strokeWidth={2} />
            </span>
            {feature.eyebrow}
          </p>
          <h2
            id={headingId}
            className='mt-4 text-[32px] leading-[1.1] font-bold tracking-[-0.028em] text-balance sm:text-[42px]'
          >
            {feature.title}
          </h2>
          <p className='mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground text-pretty'>
            {feature.body}
          </p>
          {feature.points ? (
            <ul className='mt-6 grid gap-2.5 text-[15px]'>
              {feature.points.map((point) => (
                <li key={point} className='flex gap-2.5'>
                  <Check className={cn('mt-[3px] size-4 shrink-0', tone.check)} strokeWidth={2.5} />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={cn('min-w-0 lg:col-span-7', reversed && 'lg:order-1 lg:col-start-1 lg:row-start-1')}>
          <div aria-hidden='true' className={cn('rounded-2xl p-4 select-none sm:p-8 lg:p-10', tone.panel)}>
            {feature.visual}
          </div>
        </div>
      </div>
    </section>
  );
}
