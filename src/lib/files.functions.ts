import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { db } from '~/db';
import { noteFile } from '~/db/schema';
import { auth } from '~/lib/auth';
import { MAX_ATTACHMENT_BYTES } from '~/lib/note-files';
import type { AttachedFile } from '~/lib/note-files';
import { getStorageErrorCode } from '~/lib/storage';

function parseUpload(data: FormData) {
  if (!(data instanceof FormData)) throw new Error('Invalid upload.');
  const file = data.get('file');
  const noteId = data.get('noteId');
  if (!(file instanceof File) || file.size === 0) throw new Error('Choose a file to attach.');
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Files can be up to 50 MB.');
  if (typeof noteId !== 'string' || noteId.length < 1 || noteId.length > 100) {
    throw new Error('Invalid upload.');
  }
  return { file, noteId };
}

/** Stores a file in Layerwise Storage and records it for the signed-in user. */
export const uploadNoteFile = createServerFn({ method: 'POST' })
  .validator(parseUpload)
  .handler(async ({ data: { file, noteId } }): Promise<AttachedFile> => {
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) throw new Error('Sign in to attach files.');
    const userId = session.user.id;

    const { maxFileBytes } = await env.STORAGE.usage();
    if (file.size > maxFileBytes) throw new Error(`Files can be up to ${formatBytes(maxFileBytes)}.`);

    const id = crypto.randomUUID();
    const key = `attachments/${userId}/${id}`;
    const name = file.name.slice(0, 255) || 'file';
    const contentType = file.type || 'application/octet-stream';
    try {
      await env.STORAGE.put(key, file.stream(), { size: file.size, contentType, customMetadata: { name } });
    } catch (error) {
      const code = getStorageErrorCode(error);
      if (code === 'StorageQuotaExceeded') throw new Error('Storage is full. Delete some files and try again.');
      if (code === 'FileTooLarge') throw new Error('This file is too large.');
      if (code === 'BlockedContent') throw new Error('This file can’t be uploaded.');
      throw error;
    }

    try {
      await db.insert(noteFile).values({ id, userId, noteId, key, name, size: file.size, contentType, createdAt: Date.now() });
    } catch (error) {
      // Don't leave an unreferenced file behind.
      await env.STORAGE.delete(key);
      throw error;
    }
    return { id, name, contentType };
  });

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${Math.round(mb)} MB`;
}
