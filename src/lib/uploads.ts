// Browser side of a file upload: asks the server for an upload link, PUTs the
// file straight to Storage (with XHR, which reports upload progress, unlike
// fetch), then records it with `finishFileUpload`.
import { finishFileUpload, startFileUpload } from '~/lib/files.functions';
import { MAX_ATTACHMENT_BYTES } from '~/lib/note-files';
import type { AttachedFile } from '~/lib/note-files';

/** Uploads `file` to the page; `onProgress` receives 0–1 while the bytes go up. */
export async function uploadFile(
  file: File,
  pageId: string,
  onProgress?: (fraction: number) => void
): Promise<AttachedFile> {
  if (file.size === 0) throw new Error('This file is empty.');
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error('Files can be up to 5 GB.');
  const name = file.name || 'file';
  const contentType = file.type || 'application/octet-stream';
  const upload = await startFileUpload({ data: { name, size: file.size, contentType } });
  await putFile(upload, file, onProgress);
  return finishFileUpload({
    data: { fileId: upload.fileId, uploadId: upload.uploadId, pageId, name, contentType }
  });
}

function putFile(
  upload: { url: string; headers: Record<string, string> },
  file: File,
  onProgress?: (fraction: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', upload.url);
    // Storage signs these headers; send exactly them.
    for (const [name, value] of Object.entries(upload.headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`The upload failed (${xhr.status}). Try again.`));
    };
    xhr.onerror = () => reject(new Error('The upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('The upload was canceled.'));
    xhr.send(file);
  });
}
