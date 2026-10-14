// Browser-side export actions for a single note.
import { toast } from 'sonner';
import { markdownFileName, noteToMarkdown } from '~/lib/note-format';
import type { Note } from '~/lib/notes';

export function copyNoteMarkdown(note: Note) {
  navigator.clipboard
    .writeText(noteToMarkdown(note))
    .then(() => toast.success('Copied as Markdown'))
    .catch(() => toast.error('Couldn’t copy to the clipboard.'));
}

export function downloadNoteMarkdown(note: Note) {
  const url = URL.createObjectURL(new Blob([noteToMarkdown(note)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = markdownFileName(note);
  link.click();
  // Give the download a moment to start before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
