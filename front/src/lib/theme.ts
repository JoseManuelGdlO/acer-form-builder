/** HSL string format used in CSS: "H S% L%" (e.g. "234 66% 30%"). */
export type HslString = string;

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
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
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

/**
 * Apply company theme (CSS variables) to the document.
 * Keys should match :root vars in index.css (e.g. "primary", "primary-foreground").
 * Values are HSL without hsl() wrapper, e.g. "234 66% 30%".
 */
export function applyTheme(theme: Record<string, string> | null): void {
  const root = document.documentElement;
  if (!theme || typeof theme !== 'object') {
    return;
  }
  Object.entries(theme).forEach(([key, value]) => {
    if (value != null && value !== '') {
      const cssVar = key.startsWith('--') ? key : `--${key}`;
      root.style.setProperty(cssVar, value);
    }
  });
}

/**
 * Clear any theme variables that were set (optional; useful when switching tenant).
 * We only clear known theme keys to avoid touching other inline styles.
 */
export function clearTheme(themeKeys?: string[]): void {
  const root = document.documentElement;
  const keys = themeKeys ?? [];
  keys.forEach((key) => {
    const cssVar = key.startsWith('--') ? key : `--${key}`;
    root.style.removeProperty(cssVar);
  });
}
