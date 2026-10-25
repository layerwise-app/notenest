// Pure helpers for files attached to notes. Notes never store Storage URLs
// (they expire); they store `/api/files/<id>`, a stable app route that checks
// the signed-in user owns the file and redirects to a short-lived signed URL.

const FILE_REF = /^\/api\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Largest file the app accepts; Storage's per-file plan limit may be lower. */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

// Formats every browser can show in an <img>. SVG stays a download link.
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);

export type AttachedFile = { id: string; name: string; contentType: string };

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

/** `![name](/api/files/<id>)` for images, `[name](/api/files/<id>)` otherwise. */
export function attachmentMarkdown(file: AttachedFile) {
  // Brackets, backslashes, and line breaks would end the label early.
  const label =
    file.name
      .replace(/[[\]\\\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'file';
  const link = `[${label}](${filePath(file.id)})`;
  return isPreviewableImage(file.contentType) ? `!${link}` : link;
}

/**
 * Makes file references absolute for Markdown that leaves the app (copy,
 * export), so links still open the file in a browser signed in to NoteNest.
 */
export function absoluteFileRefs(markdown: string, origin: string) {
  return markdown.replace(/\]\(\/api\/files\//g, `](${origin}/api/files/`);
}
