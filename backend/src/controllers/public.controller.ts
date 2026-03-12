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
 * Stored domain can be hostname (e.g. 192.168.100.73) or full URL (e.g. http://192.168.100.73:8080/).
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

    let company = await Company.findOne({
      where: {
        [Op.or]: [
          { domain: hostname },
          { slug: hostname },
        ],
      },
      attributes: ['id', 'name', 'slug', 'logoUrl', 'domain', 'theme'],
    });

    if (!company) {
      const withDomain = await Company.findAll({
        where: { domain: { [Op.ne]: null } },
        attributes: ['id', 'name', 'slug', 'logoUrl', 'domain', 'theme'],
      });
      company = withDomain.find(c => normalizeToHostname((c as any).domain || '') === hostname) || null;
    }

    if (!company) {
      console.log('[tenant] no company found for hostname:', hostname);
      res.status(404).json({ error: 'Dominio no registrado', code: 'TENANT_NOT_FOUND' });
      return;
    }

    const theme = (company as any).theme && typeof (company as any).theme === 'object'
      ? (company as any).theme
      : null;

    res.json({
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
      },
      theme,
    });
  } catch (error) {
    console.error('Get tenant by domain error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
