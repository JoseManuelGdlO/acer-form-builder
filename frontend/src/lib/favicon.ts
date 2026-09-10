const DEFAULT_FAVICON = '/favicon.png';
const DEFAULT_APPLE_TOUCH = '/apple-touch-icon.png';
const FAVICON_CACHE_BUST = '3';
const LINK_ID_ICON = 'dynamic-favicon';
const LINK_ID_APPLE = 'dynamic-apple-touch-icon';

const LOCAL_DEFAULT_ALIASES = new Set(['', 'favicon.ico', '/favicon.ico', '/favicon.png']);

/**
 * Resolve a stored favicon value to a browser-safe href.
 * Bare `favicon.ico` (256×256 only) often renders blank in the tab; the PNG is the default.
 */
export function normalizeFaviconUrl(url: string | null | undefined): string {
  const raw = (url ?? '').trim();
  if (LOCAL_DEFAULT_ALIASES.has(raw)) {
    return `${DEFAULT_FAVICON}?v=${FAVICON_CACHE_BUST}`;
  }
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith('data:') && !raw.startsWith('/')) {
    return `/${raw}`;
  }
  return raw;
}

/** Persist empty/default aliases as null so the app uses the bundled PNG. */
export function toStoredFaviconUrl(url: string | null | undefined): string | null {
  const raw = (url ?? '').trim();
  if (LOCAL_DEFAULT_ALIASES.has(raw)) return null;
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith('data:') && !raw.startsWith('/')) {
    return `/${raw}`;
  }
  return raw;
}

function mimeForHref(href: string): string {
  const path = href.split('?')[0].toLowerCase();
  if (path.startsWith('data:image/')) {
    const end = path.indexOf(';');
    return end > 11 ? path.slice(5, end) : 'image/png';
  }
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  return 'image/x-icon';
}

/**
 * Apply favicon (and apple-touch-icon) from URL.
 * Removes existing icon links from the document, then adds/updates our dynamic ones.
 * If url is null or empty, uses the default /favicon.png.
 */
export function applyFavicon(url: string | null): void {
  const href = normalizeFaviconUrl(url);
  const isDefault = href.startsWith(DEFAULT_FAVICON);
  const appleHref = isDefault ? `${DEFAULT_APPLE_TOUCH}?v=${FAVICON_CACHE_BUST}` : href;
  const head = document.head;

  const existing = head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  existing.forEach((el) => el.remove());

  const iconLink = document.createElement('link');
  iconLink.rel = 'icon';
  iconLink.type = mimeForHref(href);
  iconLink.id = LINK_ID_ICON;
  iconLink.href = href;
  head.appendChild(iconLink);

  const appleLink = document.createElement('link');
  appleLink.rel = 'apple-touch-icon';
  appleLink.id = LINK_ID_APPLE;
  appleLink.href = appleHref;
  head.appendChild(appleLink);
}
