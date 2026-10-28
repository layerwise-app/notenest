import { createFileRoute } from '@tanstack/react-router';
import { FeatureSections } from '~/components/landing/FeatureSections';
import { FinalCta, LandingFooter } from '~/components/landing/LandingFooter';
import { LandingHero } from '~/components/landing/LandingHero';
import { LandingNav } from '~/components/landing/LandingNav';
import landingCss from '~/components/landing/landing.css?url';
import { SearchAndStyle } from '~/components/landing/SearchAndStyle';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      ...seo({
        title: 'NoteNest — pages, blocks, and notes in one calm workspace',
        description:
          'Nested pages, a block editor with a / menu, media, and Markdown shortcuts. Works offline in your browser and syncs when you sign in.'
      })
    ],
    links: [{ rel: 'stylesheet', href: landingCss }]
  }),
  component: LandingPage
});

function LandingPage() {
  return (
    <div className='min-h-svh overflow-x-clip bg-background text-foreground'>
      <LandingNav />
      <main>
        <LandingHero />
        <FeatureSections slotAfter='markdown' slot={<SearchAndStyle />} />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
