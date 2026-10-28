import { createFileRoute } from '@tanstack/react-router';
import { WorkspaceLayout } from '~/components/workspace/WorkspaceLayout';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/notes')({
  head: () => ({
    meta: [
      ...seo({
        title: 'NoteNest',
        description: 'Your NoteNest pages. Works offline and syncs when you sign in.'
      })
    ]
  }),
  // Pages live in the browser (IndexedDB), so the workspace renders there.
  ssr: false,
  component: WorkspaceLayout
});
