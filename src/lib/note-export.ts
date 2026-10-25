// Browser-side export actions for a single note.
import { toast } from 'sonner';
import { absoluteFileRefs } from '~/lib/note-files';
import { markdownFileName, noteToMarkdown } from '~/lib/note-format';
import type { Note } from '~/lib/notes';

// Attachment links point at this app, so make them absolute outside it.
const exportMarkdown = (note: Note) => absoluteFileRefs(noteToMarkdown(note), window.location.origin);

export function copyNoteMarkdown(note: Note) {
  navigator.clipboard
    .writeText(exportMarkdown(note))
    .then(() => toast.success('Copied as Markdown'))
    .catch(() => toast.error('Couldn’t copy to the clipboard.'));
}

export function downloadNoteMarkdown(note: Note) {
  const url = URL.createObjectURL(new Blob([exportMarkdown(note)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = markdownFileName(note);
  link.click();
  // Give the download a moment to start before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
