/** HSL string format used in CSS: "H S% L%" (e.g. "234 66% 30%"). */
export type HslString = string;

/** Keys stored in company.theme that are not CSS color variables. */
export const APP_BACKGROUND_IMAGE_KEY = 'appBackgroundImage' as const;
export const DASHBOARD_CARD_OPACITY_KEY = 'dashboardCardOpacity' as const;
export const DASHBOARD_CENTER_LOGO_IMAGE_KEY = 'dashboardCenterLogoImage' as const;
export const DEFAULT_DASHBOARD_CARD_OPACITY = 90;

/** Only these keys are applied as :root CSS variables (not data URLs / metadata). */
export const THEME_COLOR_KEYS = [
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'background',
  'foreground',
  'card',
  'card-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'border',
  'ring',
  'radius',
  'sidebar-background',
  'sidebar-foreground',
  'sidebar-primary',
  'sidebar-primary-foreground',
  'sidebar-accent',
  'sidebar-accent-foreground',
  'sidebar-border',
  'sidebar-ring',
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];

const THEME_META_KEYS = new Set<string>([
  APP_BACKGROUND_IMAGE_KEY,
  DASHBOARD_CARD_OPACITY_KEY,
  DASHBOARD_CENTER_LOGO_IMAGE_KEY,
]);

export function getDashboardCardOpacity(theme: Record<string, string> | null | undefined): number {
  const raw = theme?.[DASHBOARD_CARD_OPACITY_KEY];
  if (!raw) return DEFAULT_DASHBOARD_CARD_OPACITY;
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return DEFAULT_DASHBOARD_CARD_OPACITY;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

/**
 * Parse "H S% L%" to HSL numbers [h, s, l]. S and L are 0-100.
 */
export function parseHslString(value: string): [number, number, number] | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  const h = Math.min(360, Math.max(0, parseFloat(match[1])));
  const s = Math.min(100, Math.max(0, parseFloat(match[2])));
  const l = Math.min(100, Math.max(0, parseFloat(match[3])));
  return [h, s, l];
}

/**
 * HSL (h 0-360, s/l 0-100) to hex.
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex to HSL (h 0-360, s/l 0-100).
 */
function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 50];
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
    h *= 360;
  }
  s *= 100;
  return [Math.round(h), Math.round(s), Math.round(l * 100)];
}

/**
 * Convert "H S% L%" to #rrggbb.
 */
export function hslStringToHex(hslString: string): string {
  const parsed = parseHslString(hslString);
  if (!parsed) return '#1a237e';
  const [h, s, l] = parsed;
  return hslToHex(h, s, l);
}

/**
 * Convert #rrggbb to "H S% L%".
 */
export function hexToHslString(hex: string): HslString {
  const [h, s, l] = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

function cssVarName(key: string): string {
  return key.startsWith('--') ? key : `--${key}`;
}

/**
 * Full data URL (e.g. data:image/jpeg;base64,...) on body; toggles data-app-bg-image on html.
 */
export function applyAppBackground(theme: Record<string, string> | null | undefined): void {
  const raw = theme?.[APP_BACKGROUND_IMAGE_KEY]?.trim();
  const html = document.documentElement;
  if (raw) {
    html.setAttribute('data-app-bg-image', 'true');
    const escaped = raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    document.body.style.backgroundImage = `url("${escaped}")`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
  } else {
    html.setAttribute('data-app-bg-image', 'false');
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
  }
}

/**
 * Apply company theme (CSS variables) to the document.
 * Values are HSL without hsl() wrapper, e.g. "234 66% 30%", except `radius` which is e.g. "0.75rem".
 * Ignores metadata keys such as appBackgroundImage.
 */
export function applyTheme(theme: Record<string, string> | null): void {
  const root = document.documentElement;
  if (!theme || typeof theme !== 'object') {
    THEME_COLOR_KEYS.forEach((key) => {
      root.style.removeProperty(cssVarName(key));
    });
    applyAppBackground(null);
    return;
  }

  THEME_COLOR_KEYS.forEach((key) => {
    const value = theme[key];
    const prop = cssVarName(key);
    if (value != null && value !== '') {
      root.style.setProperty(prop, value);
    } else {
      root.style.removeProperty(prop);
    }
  });
  applyAppBackground(theme);
}

/**
 * Clear any theme variables that were set (optional; useful when switching tenant).
 * We only clear known theme keys to avoid touching other inline styles.
 */
export function clearTheme(themeKeys?: string[]): void {
  const root = document.documentElement;
  const keys = themeKeys ?? [...THEME_COLOR_KEYS];
  keys.forEach((key) => {
    if (THEME_META_KEYS.has(key)) return;
    root.style.removeProperty(cssVarName(key));
  });
}
