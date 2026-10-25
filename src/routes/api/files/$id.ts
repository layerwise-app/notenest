import { createFileRoute } from '@tanstack/react-router';
import { and, eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { db } from '~/db';
import { noteFile } from '~/db/schema';
import { auth } from '~/lib/auth';

// Stable link for a file attached to a note (`/api/files/<id>`). Notes keep
// this path instead of a Storage URL; each request checks the session owns the
// file, then redirects to a short-lived signed URL. `?download=1` downloads.
export const Route = createFileRoute('/api/files/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) return new Response('Sign in to view this file.', { status: 401 });

        const [file] = await db
          .select({ key: noteFile.key, name: noteFile.name })
          .from(noteFile)
          .where(and(eq(noteFile.id, params.id), eq(noteFile.userId, session.user.id)))
          .limit(1);
        if (!file) return new Response('File not found.', { status: 404 });

        const download = new URL(request.url).searchParams.has('download');
        const url = await env.STORAGE.signedUrl(file.key, {
          expiresIn: 3600,
          ...(download ? { download: file.name } : {})
        });
        // The signed URL outlives this cache, so repeat views skip the lookup.
        return new Response(null, {
          status: 302,
          headers: { location: url, 'cache-control': 'private, max-age=600', vary: 'cookie' }
        });
      }
    }
  }
});
