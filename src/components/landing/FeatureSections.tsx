import type * as React from 'react';
import { cn } from '~/lib/utils';
import { LinksSnippet, TagsSnippet } from '~/components/landing/snippets-organize';
import {
  ChecklistSnippet,
  ModesSnippet,
  PaletteSnippet
} from '~/components/landing/snippets-workflow';

type Feature = {
  id: string;
  title: string;
  body: string;
  /** The Markdown or shortcut a writer actually types. */
  syntax?: string;
  snippet: React.ReactNode;
};

const features: Feature[] = [
  {
    id: 'links',
    title: 'Notes that point to each other.',
    body: 'Link any note with double brackets and see every mention in its backlinks.',
    syntax: '[[Q4 planning]]',
    snippet: <LinksSnippet />
  },
  {
    id: 'tags',
    title: 'Tags that file themselves.',
    body: 'Write a #tag anywhere and it lands in the sidebar, counted and one click from a filtered list.',
    syntax: '#ideas',
    snippet: <TagsSnippet />
  },
  {
    id: 'checklists',
    title: 'Checklists you can tick.',
    body: 'Check items off right in the note; progress follows it into the list.',
    syntax: '- [ ] Book the venue',
    snippet: <ChecklistSnippet />
  },
  {
    id: 'palette',
    title: 'Everything at ⌘K.',
    body: 'Jump to a note, start from a template, or switch modes without reaching for the mouse.',
    snippet: <PaletteSnippet />
  },
  {
    id: 'modes',
    title: 'Write, split, or focus.',
    body: 'Edit Markdown, watch it render side by side, or clear away everything but the page.',
    snippet: <ModesSnippet />
  }
];

export function FeatureSections() {
  return (
    <div className='border-t border-border'>
      {features.map((feature, index) => (
        <FeatureSection key={feature.id} feature={feature} reversed={index % 2 === 1} />
      ))}
    </div>
  );
}

function FeatureSection({ feature, reversed }: { feature: Feature; reversed: boolean }) {
  const headingId = `${feature.id}-title`;
  return (
    <section
      id={feature.id}
      aria-labelledby={headingId}
      className='scroll-mt-16 border-b border-border/70 last:border-b-0'
    >
      <div className='mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:gap-16 lg:py-24'>
        <div className={cn('lg:col-span-5', reversed && 'lg:order-2 lg:col-start-8')}>
          <h2
            id={headingId}
            className='font-serif text-[32px] leading-[1.1] font-medium tracking-[-0.02em] text-balance sm:text-[42px]'
          >
            {feature.title}
          </h2>
          <p className='mt-4 max-w-md text-[16.5px] leading-relaxed text-muted-foreground text-pretty'>
            {feature.body}
          </p>
          {feature.syntax ? (
            <code className='mt-6 inline-flex h-8 items-center rounded-md border border-border bg-paper px-2.5 font-mono text-[13px] text-primary'>
              {feature.syntax}
            </code>
          ) : null}
        </div>
        <div
          className={cn(
            'min-w-0 lg:col-span-7',
            reversed && 'lg:order-1 lg:col-start-1 lg:row-start-1'
          )}
        >
          <div className='rounded-3xl border border-border/60 bg-secondary/70 p-3 sm:p-8 lg:p-10'>
            {feature.snippet}
          </div>
        </div>
      </div>
    </section>
  );
}
