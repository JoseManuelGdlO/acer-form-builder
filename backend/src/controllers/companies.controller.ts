import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Company } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

/** Normalize domain or URL to hostname only (e.g. http://192.168.100.73:8080/ -> 192.168.100.73). */
function normalizeToHostname(domainOrUrl: string): string {
  let s = (domainOrUrl || '').trim().toLowerCase();
  s = s.replace(/^https?:\/\//i, '');
  s = s.split('/')[0];
  s = s.split(':')[0];
  return s;
}

/** Parse one or many domains (comma-separated string) into normalized hostnames. */
function parseDomainList(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split(',')
    .map(part => normalizeToHostname(part))
    .filter(Boolean);
}

/** List companies for trip invite dropdown (super_admin only). Returns all companies except current user's. */
export const getCompaniesForTripShare = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles?.includes('super_admin')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const companyId = req.user.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: { id: { [Op.ne]: companyId } },
      order: [['name', 'ASC']],
    });
    res.json(companies.map(c => ({ id: c.id, name: c.name })));
  } catch (error) {
    console.error('Get companies for trip share error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyCompany = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const company = await Company.findByPk(companyId, {
      attributes: ['id', 'name', 'slug', 'logoUrl', 'domain', 'theme'],
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      domain: (company as any).domain ?? null,
      theme: (company as any).theme ?? null,
    });
  } catch (error) {
    console.error('Get my company error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMyCompany = [
  body('domain').optional().isString().trim(),
  body('theme').optional().isObject(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const company = await Company.findByPk(companyId);
      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const { domain, theme } = req.body;
      const updates: { domain?: string | null; theme?: Record<string, string> | null } = {};

      if (domain !== undefined) {
        const parts = parseDomainList(domain);
        if (parts.length === 0) {
          updates.domain = null;
        } else {
          const withDomain = await Company.findAll({
            where: { domain: { [Op.ne]: null } },
            attributes: ['id', 'domain'],
          });

          // Evitar que cualquier hostname se repita en otra empresa
          const conflict = withDomain.find(c => {
            if (c.id === companyId) return false;
            const existingParts = parseDomainList((c as any).domain || '');
            return existingParts.some(h => parts.includes(h));
          });

          if (conflict) {
            res.status(400).json({ error: 'Alguno de estos dominios ya está en uso por otra empresa' });
            return;
          }

          // Guardamos como string separado por comas (backward compatible)
          updates.domain = Array.from(new Set(parts)).join(',');
        }
      }

      if (theme !== undefined) {
        updates.theme = theme && typeof theme === 'object' ? theme : null;
      }

      if (Object.keys(updates).length > 0) {
        await company.update(updates);
      }

      const updated = await Company.findByPk(companyId, {
        attributes: ['id', 'name', 'slug', 'logoUrl', 'domain', 'theme'],
      });

      res.json({
        id: updated!.id,
        name: updated!.name,
        slug: updated!.slug,
        logoUrl: (updated as any).logoUrl,
        domain: (updated as any).domain ?? null,
        theme: (updated as any).theme ?? null,
      });
    } catch (error) {
      console.error('Update my company error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];
