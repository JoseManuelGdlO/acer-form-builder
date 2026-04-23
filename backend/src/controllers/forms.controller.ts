import { randomUUID } from 'crypto';
import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Form, Company } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

function cloneFormSectionsWithNewIds(sections: unknown): unknown[] {
  if (!Array.isArray(sections)) return [];
  return sections.map((sec: Record<string, unknown>) => {
    const newSection: Record<string, unknown> = {
      ...sec,
      id: randomUUID(),
    };
    const questions = sec.questions;
    if (Array.isArray(questions)) {
      newSection.questions = questions.map((q: Record<string, unknown>) => {
        const newQ: Record<string, unknown> = { ...q, id: randomUUID() };
        delete newQ.pdfMapping;
        const opts = q.options;
        if (Array.isArray(opts)) {
          newQ.options = opts.map((o: Record<string, unknown>) => ({
            ...o,
            id: randomUUID(),
          }));
        }
        return newQ;
      });
    }
    return newSection;
  });
}

export const getAllForms = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const forms = await Form.findAll({
      where: { companyId, isDeleted: false },
      order: [['created_at', 'DESC']],
    });

    res.json(forms);
  } catch (error) {
    console.error('Get all forms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFormById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.companyId) {
      // Authenticated: scope by company
      const form = await Form.findOne({ where: { id, companyId: req.user.companyId, isDeleted: false } });
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }
      res.json(form);
      return;
    }

    // Public (no auth): return form with company for branding
    const form = await Form.findOne({
      where: { id, isDeleted: false },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'slug', 'logoUrl'] }],
    });
    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const formJson = form.toJSON();
    const company = (form as any).company;
    res.json({
      ...formJson,
      company: company ? { id: company.id, name: company.name, slug: company.slug, logoUrl: company.logoUrl } : null,
    });
  } catch (error) {
    console.error('Get form by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const duplicateForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const source = await Form.findOne({ where: { id, companyId, isDeleted: false } });
    if (!source) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const sections = cloneFormSectionsWithNewIds(source.sections);
    const baseName = String(source.name || 'Formulario').trim();
    const form = await Form.create({
      companyId,
      name: `${baseName} (copia)`,
      description: source.description,
      sections: sections as any,
      pdfTemplateId: null,
    });
    res.status(201).json(form);
  } catch (error) {
    console.error('Duplicate form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createForm = [
  body('name').notEmpty().withMessage('Name is required'),
  body('sections').optional().isArray(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, description, sections = [] } = req.body;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const form = await Form.create({
        companyId,
        name,
        description,
        sections,
      });

      res.status(201).json(form);
    } catch (error) {
      console.error('Create form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateForm = [
  body('name').optional().notEmpty(),
  body('sections').optional().isArray(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const form = await Form.findOne({ where: { id, companyId, isDeleted: false } });

      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      await form.update(req.body);
      res.json(form);
    } catch (error) {
      console.error('Update form error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteForm = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const form = await Form.findOne({ where: { id, companyId, isDeleted: false } });

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    await form.update({ isDeleted: true });
    res.json({ message: 'Form soft deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
