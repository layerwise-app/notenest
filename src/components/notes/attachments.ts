// Browser side of note attachments: uploads files and returns the Markdown to
// insert, reporting progress and errors as toasts.
import { toast } from 'sonner';
import { uploadNoteFile } from '~/lib/files.functions';
import { attachmentMarkdown, MAX_ATTACHMENT_BYTES } from '~/lib/note-files';

/** Uploads `files` for `noteId`; resolves to Markdown for the ones that succeeded. */
export async function uploadAttachments(noteId: string, files: File[]): Promise<string | null> {
  const tooLarge = files.filter((file) => file.size > MAX_ATTACHMENT_BYTES);
  if (tooLarge.length) toast.error(`${tooLarge[0].name} is over 50 MB.`);
  const accepted = files.filter((file) => file.size > 0 && file.size <= MAX_ATTACHMENT_BYTES);
  if (!accepted.length) return null;

  const toastId = toast.loading(accepted.length === 1 ? `Uploading ${accepted[0].name}…` : `Uploading ${accepted.length} files…`);
  const results = await Promise.allSettled(
    accepted.map((file) => {
      const form = new FormData();
      form.set('file', file);
      form.set('noteId', noteId);
      return uploadNoteFile({ data: form });
    })
  );

  const uploaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  const failure = results.find((result) => result.status === 'rejected');
  if (failure) {
    const message = failure.reason instanceof Error ? failure.reason.message : '';
    toast.error(message || 'Couldn’t upload the file.', { id: toastId });
  } else {
    toast.dismiss(toastId);
  }
  return uploaded.length ? uploaded.map(attachmentMarkdown).join('\n') : null;
}
