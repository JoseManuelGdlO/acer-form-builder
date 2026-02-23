import { Request, Response } from 'express';
import { Company } from '../models';
import { Op } from 'sequelize';

/**
 * Resolve tenant (company + theme) by domain.
 * GET /api/public/tenant?domain=empresa-a.com
 * Or domain can be read from Host header.
 */
export const getTenantByDomain = async (req: Request, res: Response): Promise<void> => {
  try {
    const domain = (req.query.domain as string) || req.get('Host') || '';
    const hostname = domain.split(':')[0].toLowerCase().trim();

    if (!hostname) {
      res.status(400).json({ error: 'Domain or Host is required' });
      return;
    }

    const company = await Company.findOne({
      where: {
        [Op.or]: [
          { domain: hostname },
          { slug: hostname },
        ],
      },
      attributes: ['id', 'name', 'slug', 'logoUrl', 'domain', 'theme'],
    });

    if (!company) {
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
