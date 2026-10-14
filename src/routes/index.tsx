import { createFileRoute } from '@tanstack/react-router';
import { FeatureSections } from '~/components/landing/FeatureSections';
import { FinalCta, LandingFooter } from '~/components/landing/LandingFooter';
import { LandingHero } from '~/components/landing/LandingHero';
import { LandingNav } from '~/components/landing/LandingNav';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      ...seo({
        title: 'NoteNest — a calm Markdown notebook',
        description:
          'Tags, backlinks, and checklists in a calm Markdown notebook that works offline and syncs when you sign in.'
      })
    ]
  }),
  component: LandingPage
});

function LandingPage() {
  return (
    <div className='min-h-svh overflow-x-clip bg-background text-foreground'>
      <LandingNav />
      <main>
        <LandingHero />
        <FeatureSections />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
