const CENTER_LOGO_KEY = 'dashboardCenterLogoImage';

function parseTheme(raw: unknown): Record<string, string> | null {
  if (raw == null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** Prefer the uploaded dashboard/start logo in theme JSON; fall back to logoUrl. */
export function resolveCompanyLogoUrl(
  company: { logoUrl?: string | null; theme?: unknown } | null | undefined
): string | null {
  if (!company) return null;
  const fromTheme = parseTheme(company.theme)?.[CENTER_LOGO_KEY]?.trim();
  if (fromTheme) return fromTheme;
  const fromUrl = typeof company.logoUrl === 'string' ? company.logoUrl.trim() : '';
  return fromUrl || null;
}
