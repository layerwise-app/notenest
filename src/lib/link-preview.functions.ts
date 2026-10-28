import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { auth } from '~/lib/auth';

// Title, description, image, and icon for a web bookmark, read from the
// page's <head> on the server. Only public http(s) hosts are fetched; each
// redirect is checked the same way.

export type LinkPreview = {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
};

const TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_REDIRECTS = 4;

function parseInput(value: unknown): { url: string } {
  const input = value as { url?: unknown } | null;
  if (!input || typeof input.url !== 'string' || input.url.length > 2048) throw new Error('Invalid link.');
  const url = publicUrl(input.url);
  if (!url) throw new Error('This link can’t be previewed.');
  return { url: url.href };
}

export const fetchLinkPreview = createServerFn({ method: 'POST' })
  .validator(parseInput)
  .handler(async ({ data }): Promise<LinkPreview> => {
    // Signed-in only, so the Worker isn't an open fetch proxy.
    const session = await auth.api.getSession({ headers: getRequestHeaders() });
    if (!session) throw new Error('Sign in to load link previews.');
    try {
      return await readPreview(new URL(data.url));
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error('The page took too long to respond.');
      }
      throw error;
    }
  });

async function readPreview(start: URL): Promise<LinkPreview> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = start;
  let response: Response | null = null;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    response = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'user-agent': 'Mozilla/5.0 (compatible; NoteNestBot/1.0; link preview)'
      }
    });
    const location = response.status >= 300 && response.status < 400 ? response.headers.get('location') : null;
    if (!location) break;
    await response.body?.cancel();
    const next = publicUrl(new URL(location, url).href);
    if (!next) throw new Error('This link can’t be previewed.');
    url = next;
    response = null;
  }
  if (!response) throw new Error('Too many redirects.');

  const fallbackIcon = new URL('/favicon.ico', url).href;
  const type = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (!response.ok || !/text\/html|application\/xhtml/.test(type)) {
    await response.body?.cancel();
    const isImage = response.ok && type.startsWith('image/');
    return { title: null, description: null, image: isImage ? url.href : null, favicon: fallbackIcon };
  }

  const head = await readHead(response);
  const meta = (...keys: string[]) => keys.map((key) => head.meta.get(key)).find((value) => value?.trim());
  return {
    title: clean(meta('og:title', 'twitter:title') ?? head.title, 300),
    description: clean(meta('og:description', 'twitter:description', 'description'), 500),
    image: absolute(meta('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'), url),
    favicon: absolute(head.icon, url) ?? fallbackIcon
  };
}

type Head = { meta: Map<string, string>; title: string; icon: string | undefined };

/** Reads <meta>, <title>, and icon links, stopping at <body> or the size limit. */
async function readHead(response: Response): Promise<Head> {
  const meta = new Map<string, string>();
  let title = '';
  let titleDone = false;
  let icon: string | undefined;
  let touchIcon: string | undefined;
  let reachedBody = false;

  const rewriter = new HTMLRewriter()
    .on('meta', {
      element(element) {
        const key = (element.getAttribute('property') ?? element.getAttribute('name') ?? '').trim().toLowerCase();
        const content = element.getAttribute('content');
        if (key && content && !meta.has(key)) meta.set(key, content);
      }
    })
    .on('title', {
      text(chunk) {
        if (titleDone) return;
        title += chunk.text;
        if (chunk.lastInTextNode) titleDone = true;
      }
    })
    .on('link', {
      element(element) {
        const rel = ` ${(element.getAttribute('rel') ?? '').toLowerCase()} `;
        const href = element.getAttribute('href') ?? undefined;
        if (!href) return;
        if (!icon && / icon /.test(rel.replace('shortcut', ''))) icon = href;
        else if (!touchIcon && rel.includes(' apple-touch-icon')) touchIcon = href;
      }
    })
    .on('body', {
      element() {
        reachedBody = true;
      }
    });

  const body = response.body;
  if (!body) return { meta, title, icon };
  const limited = limitStream(body, MAX_HTML_BYTES, () => reachedBody);
  const headers = { 'content-type': response.headers.get('content-type') ?? 'text/html' };
  await rewriter.transform(new Response(limited, { headers })).arrayBuffer();
  return { meta, title, icon: icon ?? touchIcon };
}

function limitStream(body: ReadableStream<Uint8Array>, maxBytes: number, done: () => boolean) {
  const reader = body.getReader();
  let total = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (done() || total >= maxBytes) {
        await reader.cancel();
        controller.close();
        return;
      }
      const chunk = await reader.read();
      if (chunk.done) {
        controller.close();
        return;
      }
      total += chunk.value.byteLength;
      controller.enqueue(chunk.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    }
  });
}

/** An http(s) URL on a public host: no credentials, odd ports, or private addresses. */
function publicUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.username || url.password || url.port) return null;
  return isPublicHost(url.hostname) ? url : null;
}

const PRIVATE_SUFFIXES = ['.localhost', '.local', '.internal', '.intranet', '.lan', '.home', '.corp', '.home.arpa'];

function isPublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[')) return isPublicIPv6(host.slice(1, -1));
  if (!host.includes('.') || PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix))) return false;
  // URL parsing already turned other IPv4 spellings (hex, one number) into dotted form.
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
  return ipv4 ? isPublicIPv4(ipv4.slice(1).map(Number)) : true;
}

function isPublicIPv4([a, b]: number[]) {
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || b === 0)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return true;
}

// Only global unicast (2000::/3), which excludes loopback, link-local,
// unique-local, and IPv4-mapped addresses.
function isPublicIPv6(address: string) {
  const first = Number.parseInt(address.split(':')[0] || '0', 16);
  return first >= 0x2000 && first <= 0x3fff && !address.startsWith('2001:db8');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text: string) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return ENTITIES[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}

function clean(value: string | undefined, maxLength: number) {
  const text = value ? decodeEntities(value).replace(/\s+/g, ' ').trim() : '';
  return text ? text.slice(0, maxLength) : null;
}

function absolute(value: string | undefined, base: URL) {
  if (!value?.trim()) return null;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}
