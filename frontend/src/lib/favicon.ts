const DEFAULT_FAVICON = '/favicon.ico';
const LINK_ID_ICON = 'dynamic-favicon';
const LINK_ID_APPLE = 'dynamic-apple-touch-icon';

/**
 * Apply favicon (and apple-touch-icon) from URL.
 * Removes existing icon links from the document, then adds/updates our dynamic ones.
 * If url is null or empty, uses the default /favicon.ico.
 */
export function applyFavicon(url: string | null): void {
  const href = (url && url.trim()) ? url.trim() : DEFAULT_FAVICON;
  const head = document.head;

  // Remove existing favicon links so we don't duplicate (static ones from index.html)
  const existing = head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
  existing.forEach((el) => el.remove());

  let iconLink = document.getElementById(LINK_ID_ICON) as HTMLLinkElement | null;
  let appleLink = document.getElementById(LINK_ID_APPLE) as HTMLLinkElement | null;

  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = 'image/x-icon';
    iconLink.id = LINK_ID_ICON;
    head.appendChild(iconLink);
  }
  iconLink.href = href;

  if (!appleLink) {
    appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.id = LINK_ID_APPLE;
    head.appendChild(appleLink);
  }
  appleLink.href = href;
}
