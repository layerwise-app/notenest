// URL checks and embed providers for media blocks. Pure: no DOM or React.
import { fileRefId } from '~/lib/note-files';

/**
 * Normalizes what someone typed or pasted into an absolute http(s) URL.
 * Accepts "example.com/page" like Notion does; rejects other schemes.
 */
export function safeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname;
  if (!host || (!host.includes('.') && host !== 'localhost' && !host.startsWith('['))) return null;
  return url.href;
}

/** A stored media `src`: an app file reference or an absolute http(s) URL. */
export function mediaSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (fileRefId(trimmed)) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? safeHttpUrl(trimmed) : null;
}

/** A readable name for a linked file: the last path segment, else the host. */
export function fileNameFromUrl(value: string): string {
  try {
    const url = new URL(value, 'https://local.invalid');
    const segment = url.pathname.split('/').filter(Boolean).pop();
    if (segment) return decodeURIComponent(segment);
    return url.hostname === 'local.invalid' ? value : url.hostname;
  } catch {
    return value;
  }
}

export type EmbedProvider =
  | 'youtube'
  | 'vimeo'
  | 'loom'
  | 'figma'
  | 'maps'
  | 'codepen'
  | 'spotify'
  | 'soundcloud'
  | 'google'
  | 'web';

export type EmbedTarget = {
  provider: EmbedProvider;
  /** The iframe URL. */
  src: string;
  /** Width ÷ height for video players; null means a fixed, resizable height. */
  aspectRatio: number | null;
  /** Default height in px when `aspectRatio` is null. */
  height: number;
};

const VIDEO_PROVIDERS = new Set<EmbedProvider>(['youtube', 'vimeo', 'loom']);

const video = (provider: EmbedProvider, src: string): EmbedTarget => ({ provider, src, aspectRatio: 16 / 9, height: 0 });
const frame = (provider: EmbedProvider, src: string, height = 400): EmbedTarget => ({
  provider,
  src,
  aspectRatio: null,
  height
});

/** How to show a link in an embed block; null for links that aren't http(s). */
export function embedTarget(value: string): EmbedTarget | null {
  const href = safeHttpUrl(value);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  return (
    youtube(url, host, parts) ??
    vimeo(url, host, parts) ??
    loom(host, parts) ??
    figma(href, host, parts) ??
    googleMaps(url, host, parts) ??
    codepen(host, parts) ??
    spotify(host, parts) ??
    soundcloud(href, host, parts) ??
    google(host, parts) ??
    frame('web', href)
  );
}

/** The player for a YouTube, Vimeo, or Loom link; null for anything else. */
export function videoEmbed(value: string): EmbedTarget | null {
  const target = embedTarget(value);
  return target && VIDEO_PROVIDERS.has(target.provider) ? target : null;
}

const YOUTUBE_ID = /^[\w-]{11}$/;

function youtube(url: URL, host: string, parts: string[]): EmbedTarget | null {
  let id: string | null = null;
  if (host === 'youtu.be') id = parts[0] ?? null;
  else if (['youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  const params = new URLSearchParams();
  const start = seconds(url.searchParams.get('t') ?? url.searchParams.get('start'));
  if (start) params.set('start', String(start));
  const list = url.searchParams.get('list');
  if (list && /^[\w-]+$/.test(list)) params.set('list', list);
  const query = params.toString();
  return video('youtube', `https://www.youtube.com/embed/${id}${query ? `?${query}` : ''}`);
}

/** "90", "90s", or "1h2m3s" → seconds. */
function seconds(value: string | null): number {
  if (!value) return 0;
  if (/^\d+s?$/.test(value)) return Number.parseInt(value, 10);
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function vimeo(url: URL, host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const index = parts.findIndex((part) => /^\d+$/.test(part));
  if (index < 0) return null;
  // Unlisted videos carry a privacy hash: vimeo.com/<id>/<hash> or ?h=<hash>.
  const next = parts[index + 1];
  const hash = url.searchParams.get('h') ?? (next && /^[\da-f]+$/i.test(next) ? next : null);
  const query = hash && /^[\da-f]+$/i.test(hash) ? `?h=${hash}` : '';
  return video('vimeo', `https://player.vimeo.com/video/${parts[index]}${query}`);
}

function loom(host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'loom.com' || !['share', 'embed'].includes(parts[0] ?? '')) return null;
  const id = parts[1];
  return id && /^[\w-]+$/.test(id) ? video('loom', `https://www.loom.com/embed/${id}`) : null;
}

function figma(href: string, host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'figma.com') return null;
  if (!['file', 'design', 'proto', 'board', 'slides', 'deck', 'make'].includes(parts[0] ?? '')) return null;
  return frame('figma', `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(href)}`, 450);
}

function googleMaps(url: URL, host: string, parts: string[]): EmbedTarget | null {
  const isGoogle = host === 'maps.google.com' || /^google\.[a-z.]+$/.test(host);
  if (!isGoogle || (host !== 'maps.google.com' && parts[0] !== 'maps')) return null;
  if (parts[1] === 'embed') return frame('maps', url.href, 450);
  // Ordinary Maps pages refuse to load in frames; the classic embed accepts a query.
  const place = parts[1] === 'place' && parts[2] ? decodeURIComponent(parts[2].replace(/\+/g, ' ')) : null;
  const at = /^@(-?[\d.]+),(-?[\d.]+)(?:,([\d.]+)z)?/.exec(parts.find((part) => part.startsWith('@')) ?? '');
  const query = url.searchParams.get('q') ?? place ?? (at ? `${at[1]},${at[2]}` : null);
  if (!query) return null;
  const zoom = at?.[3] ? `&z=${Math.round(Number(at[3]))}` : '';
  return frame('maps', `https://maps.google.com/maps?q=${encodeURIComponent(query)}${zoom}&output=embed`, 450);
}

function codepen(host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'codepen.io' || !['pen', 'full', 'details', 'embed'].includes(parts[1] ?? '')) return null;
  const [user, , id] = parts;
  if (!user || !id || !/^[\w-]+$/.test(user) || !/^\w+$/.test(id)) return null;
  return frame('codepen', `https://codepen.io/${user}/embed/${id}?default-tab=result`);
}

function spotify(host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'open.spotify.com') return null;
  const rest = parts[0]?.startsWith('intl-') ? parts.slice(1) : parts;
  const [type, id] = rest;
  if (!type || !id || !['track', 'album', 'playlist', 'episode', 'show', 'artist'].includes(type) || !/^\w+$/.test(id)) {
    return null;
  }
  const compact = type === 'track' || type === 'episode';
  return frame('spotify', `https://open.spotify.com/embed/${type}/${id}`, compact ? 152 : 352);
}

function soundcloud(href: string, host: string, parts: string[]): EmbedTarget | null {
  if (host !== 'soundcloud.com' || parts.length < 2) return null;
  const isSet = parts[1] === 'sets';
  return frame(
    'soundcloud',
    `https://w.soundcloud.com/player/?url=${encodeURIComponent(href)}&visual=false`,
    isSet ? 450 : 166
  );
}

function google(host: string, parts: string[]): EmbedTarget | null {
  if (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd' && parts[2]) {
    return frame('google', `https://drive.google.com/file/d/${parts[2]}/preview`, 480);
  }
  if (host !== 'docs.google.com') return null;
  const [kind, d, idOrE, published] = parts;
  if (d !== 'd' || !idOrE || !['document', 'presentation', 'spreadsheets', 'forms'].includes(kind ?? '')) return null;
  const base = `https://docs.google.com/${kind}/d/${idOrE}`;
  // Published links: /d/e/<id>/pub (docs, slides), /pubhtml (sheets), /viewform (forms).
  if (idOrE === 'e' && published) {
    const pubBase = `${base}/${published}`;
    if (kind === 'document') return frame('google', `${pubBase}/pub?embedded=true`, 480);
    if (kind === 'presentation') return frame('google', `${pubBase}/embed`, 480);
    if (kind === 'spreadsheets') return frame('google', `${pubBase}/pubhtml?widget=true&headers=false`, 480);
    return frame('google', `${pubBase}/viewform?embedded=true`, 640);
  }
  if (kind === 'presentation') return frame('google', `${base}/embed`, 480);
  if (kind === 'forms') return frame('google', `${base}/viewform?embedded=true`, 640);
  return frame('google', `${base}/preview`, 480);
}
