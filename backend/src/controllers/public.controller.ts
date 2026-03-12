import { Request, Response } from 'express';
import { Company } from '../models';
import { Op } from 'sequelize';

/**
 * Normalize a domain or full URL to hostname only (no protocol, port, or path).
 * e.g. "http://192.168.100.73:8080/" -> "192.168.100.73"
 */
function normalizeToHostname(domainOrUrl: string): string {
  let s = (domainOrUrl || '').trim().toLowerCase();
  s = s.replace(/^https?:\/\//i, '');
  s = s.split('/')[0];
  s = s.split(':')[0];
  return s;
}

/**
 * Resolve tenant (company + theme) by domain.
 * GET /api/public/tenant?domain=empresa-a.com
 * Or domain can be read from Host header.
 * Stored domain can be hostname (e.g. 192.168.100.73) or full URL (e.g. http://192.168.100.73:8080/),
 * or a comma-separated list of hostnames/URLs.
 */
export const getTenantByDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const domain = (req.query.domain as string) || req.get('Host') || '';
    const hostname = normalizeToHostname(domain);
    console.log('[tenant] domain param:', req.query.domain, 'Host header:', req.get('Host'), '-> hostname:', hostname);

    if (!hostname) {
      res.status(400).json({ error: 'Domain or Host is required' });
      return;
    }

    // Primero intentamos por slug directo
    let company = await Company.findOne({
      where: { slug: hostname },
      attributes: ['id', 'name', 'slug', 'logoUrl', 'faviconUrl', 'domain', 'theme'],
    });

    if (!company) {
      // Luego buscamos por dominio (puede ser uno o varios separados por coma)
      const withDomain = await Company.findAll({
        where: { domain: { [Op.ne]: null } },
        attributes: ['id', 'name', 'slug', 'logoUrl', 'faviconUrl', 'domain', 'theme'],
      });

      company =
        withDomain.find(c => {
          const raw = (c as any).domain || '';
          const parts = String(raw)
            .split(',')
            .map(part => normalizeToHostname(part))
            .filter(Boolean);
          return parts.includes(hostname);
        }) || null;
    }

    if (!company) {
      console.log('[tenant] no company found for hostname:', hostname);
      res.status(404).json({ error: 'Dominio no registrado', code: 'TENANT_NOT_FOUND' });
      return;
    }

    // Normalizar theme: MySQL/Sequelize a veces devuelve JSON como string
    const rawTheme = (company as any).theme ?? (company as any).dataValues?.theme;
    let theme: Record<string, string> | null = null;
    if (rawTheme != null) {
      if (typeof rawTheme === 'object' && !Array.isArray(rawTheme)) {
        theme = rawTheme as Record<string, string>;
      } else if (typeof rawTheme === 'string') {
        try {
          const parsed = JSON.parse(rawTheme) as unknown;
          theme = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, string>) : null;
        } catch {
          theme = null;
        }
      }
    }

    res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        faviconUrl: (company as any).faviconUrl ?? null,
      },
      theme,
    });
  } catch (error) {
    console.error('Get tenant by domain error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
