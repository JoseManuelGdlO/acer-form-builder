import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Company } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

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
        const trimmed = typeof domain === 'string' ? domain.trim() : '';
        if (trimmed === '') {
          updates.domain = null;
        } else {
          const existing = await Company.findOne({
            where: { domain: trimmed },
          });
          if (existing && existing.id !== companyId) {
            res.status(400).json({ error: 'Este dominio ya está en uso por otra empresa' });
            return;
          }
          updates.domain = trimmed;
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
