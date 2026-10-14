import { FileText } from 'lucide-react';
import { SectionLabel } from '~/components/notes/note-ui';
import { findBacklinks } from '~/lib/note-text';
import type { Note } from '~/lib/notes';

/** Notes whose `[[wiki links]]` point at this note's title. */
export function Backlinks({
  note,
  notes,
  onOpenNote
}: {
  note: Note;
  notes: Note[];
  onOpenNote: (id: string) => void;
}) {
  const backlinks = findBacklinks(notes, note);
  if (!backlinks.length) return null;

  return (
    <section aria-label='Backlinks' className='mt-14 border-t border-border pt-5 font-sans'>
      <SectionLabel>
        Linked from {backlinks.length} {backlinks.length === 1 ? 'note' : 'notes'}
      </SectionLabel>
      <ul className='mt-3 grid gap-2 sm:grid-cols-2'>
        {backlinks.map(({ note: source, excerpt }) => (
          <li key={source.id}>
            <button
              type='button'
              onClick={() => onOpenNote(source.id)}
              className='group block w-full rounded-lg border border-border bg-background px-3.5 py-3 text-left transition-colors outline-none hover:border-primary/30 hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/30'
            >
              <span className='flex items-center gap-2 text-[13.5px] font-semibold'>
                <FileText className='size-3.5 shrink-0 text-muted-foreground group-hover:text-primary' />
                <span className='truncate'>{source.title.trim() || 'Untitled'}</span>
              </span>
              {excerpt ? (
                <span className='mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground'>
                  {excerpt}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
