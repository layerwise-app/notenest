// Pure helpers for files uploaded to pages. Pages never store Storage URLs
// (they expire); they store `/api/files/<id>`, a stable app route that checks
// the signed-in user owns the file and redirects to a short-lived signed URL.

const FILE_REF = /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Largest file the app accepts; Storage's per-file plan limit may be lower. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 * 1024;

export type AttachedFile = { id: string; name: string; contentType: string; size: number };

export type MediaKind = 'image' | 'video' | 'audio' | 'file';

// Formats every browser can show in an <img>. SVG stays a download link.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

/** Returns the file ID when `href` is an app file reference, otherwise null. */
export function fileRefId(href: string): string | null {
  return FILE_REF.exec(href)?.[1] ?? null;
}

export function filePath(id: string, download = false) {
  return `/api/files/${id}${download ? '?download=1' : ''}`;
}

export function isPreviewableImage(contentType: string) {
  return IMAGE_TYPES.has(contentType.toLowerCase());
}

/** Which media block shows a file of this type. */
export function mediaKindFor(contentType: string): MediaKind {
  const type = contentType.toLowerCase();
  if (isPreviewableImage(type)) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'file';
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Makes file references absolute for Markdown that leaves the app (copy,
 * export), so links still open the file in a browser signed in to NoteNest.
 */
export function absoluteFileRefs(markdown: string, origin: string) {
  return markdown.replace(/\]\(\/api\/files\//g, `](${origin}/api/files/`);
}
