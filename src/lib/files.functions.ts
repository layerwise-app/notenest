import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { db } from '~/db';
import { noteFile } from '~/db/schema';
import { auth } from '~/lib/auth';
import { MAX_ATTACHMENT_BYTES } from '~/lib/note-files';
import type { AttachedFile } from '~/lib/note-files';
import { getStorageErrorCode } from '~/lib/storage';

// Uploads go straight from the browser to Layerwise Storage: the server
// creates a short-lived upload link, the browser PUTs the file (with
// progress), then `finishFileUpload` stores it and records it in D1.

const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const requireUserId = async () => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error('Sign in to upload files.');
  return session.user.id;
};

const fileKey = (userId: string, fileId: string) => `attachments/${userId}/${fileId}`;

type StartInput = { name: string; size: number; contentType: string };

function parseStart(value: unknown): StartInput {
  const input = value as Partial<StartInput> | null;
  if (
    !input ||
    typeof input.name !== 'string' ||
    typeof input.contentType !== 'string' || input.contentType.length > 200 ||
    typeof input.size !== 'number' || !Number.isSafeInteger(input.size) || input.size <= 0
  ) {
    throw new Error('Invalid upload.');
  }
  if (input.size > MAX_ATTACHMENT_BYTES) throw new Error('Files can be up to 5 GB.');
  return { name: input.name, size: input.size, contentType: input.contentType };
}

export const startFileUpload = createServerFn({ method: 'POST' })
  .validator(parseStart)
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const { maxFileBytes } = await env.STORAGE.usage();
    if (data.size > maxFileBytes) throw new Error(`Files can be up to ${formatBytes(maxFileBytes)} on this plan.`);

    const fileId = crypto.randomUUID();
    try {
      const upload = await env.STORAGE.createUpload({
        key: fileKey(userId, fileId),
        size: data.size,
        contentType: data.contentType || 'application/octet-stream',
        customMetadata: { name: data.name.slice(0, 255) || 'file' }
      });
      return { fileId, uploadId: upload.id, url: upload.url, headers: upload.headers };
    } catch (error) {
      throw storageError(error);
    }
  });

type FinishInput = { fileId: string; uploadId: string; pageId: string; name: string; contentType: string };

function parseFinish(value: unknown): FinishInput {
  const input = value as Partial<FinishInput> | null;
  if (
    !input ||
    typeof input.fileId !== 'string' || !FILE_ID.test(input.fileId) ||
    typeof input.uploadId !== 'string' || input.uploadId.length < 1 || input.uploadId.length > 500 ||
    typeof input.pageId !== 'string' || input.pageId.length < 1 || input.pageId.length > 100 ||
    typeof input.name !== 'string' ||
    typeof input.contentType !== 'string' || input.contentType.length > 200
  ) {
    throw new Error('Invalid upload.');
  }
  return input as FinishInput;
}

export const finishFileUpload = createServerFn({ method: 'POST' })
  .validator(parseFinish)
  .handler(async ({ data }): Promise<AttachedFile> => {
    const userId = await requireUserId();
    const key = fileKey(userId, data.fileId);
    let object;
    try {
      object = await env.STORAGE.completeUpload(data.uploadId);
    } catch (error) {
      throw storageError(error);
    }
    // The upload id is a bearer secret; still make sure it was this user's file.
    if (object.key !== key) throw new Error('Invalid upload.');

    const name = data.name.slice(0, 255) || 'file';
    const contentType = object.contentType || data.contentType || 'application/octet-stream';
    try {
      await db.insert(noteFile).values({
        id: data.fileId,
        userId,
        noteId: data.pageId,
        key,
        name,
        size: object.size,
        contentType,
        createdAt: Date.now()
      });
    } catch (error) {
      // Don't leave an unreferenced file behind.
      await env.STORAGE.delete(key);
      throw error;
    }
    return { id: data.fileId, name, contentType, size: object.size };
  });

function storageError(error: unknown) {
  const code = getStorageErrorCode(error);
  if (code === 'StorageQuotaExceeded') return new Error('Storage is full. Delete some files and try again.');
  if (code === 'FileTooLarge') return new Error('This file is too large.');
  if (code === 'BlockedContent') return new Error('This file can’t be uploaded.');
  if (code === 'UploadNotFound' || code === 'UploadIncomplete') return new Error('The upload didn’t finish. Try again.');
  return error instanceof Error ? error : new Error('Upload failed.');
}

function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${Math.round(mb / 1024)} GB` : `${Math.round(mb)} MB`;
}
