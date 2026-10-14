import { createFileRoute } from '@tanstack/react-router';
import { NotesApp } from '~/components/notes/NotesApp';
import { seo } from '~/utils/seo';

export const Route = createFileRoute('/notes')({
  head: () => ({
    meta: [
      ...seo({
        title: 'Notes — NoteNest',
        description: 'Your NoteNest notebook. Works offline and syncs when you sign in.'
      })
    ]
  }),
  component: NotesApp
});
