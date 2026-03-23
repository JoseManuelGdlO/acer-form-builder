import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { VisaStatusTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const isValidHexColor = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') return true;
  return typeof value === 'string' && /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(value);
};

export const getAllVisaStatusTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const templates = await VisaStatusTemplate.findAll({
      where: { companyId },
      order: [['order', 'ASC']],
    });

    res.json(templates);
  } catch (error) {
    console.error('Get visa status templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVisaStatusTemplate = [
  body('label').notEmpty().withMessage('Label is required'),
  body('order').optional().isInt(),
  body('color').optional({ values: 'null' }).custom(isValidHexColor).withMessage('Color must be a valid hex value'),
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

      const { label, order, isActive, color } = req.body;
      const template = await VisaStatusTemplate.create({
        label,
        order,
        isActive,
        color: color === '' || color === undefined ? null : color,
        companyId,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error('Create visa status template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateVisaStatusTemplate = [
  body('label').optional().notEmpty(),
  body('order').optional().isInt(),
  body('isActive').optional().isBoolean(),
  body('color').optional({ values: 'null' }).custom(isValidHexColor).withMessage('Color must be a valid hex value'),
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

      const template = await VisaStatusTemplate.findOne({ where: { id, companyId } });
      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      const { label, order, isActive, color } = req.body;
      const patch: Record<string, unknown> = {};
      if (label !== undefined) patch.label = label;
      if (order !== undefined) patch.order = order;
      if (isActive !== undefined) patch.isActive = isActive;
      if (color !== undefined) patch.color = color === '' ? null : color;

      await template.update(patch);
      res.json(template);
    } catch (error) {
      console.error('Update visa status template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteVisaStatusTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const template = await VisaStatusTemplate.findOne({ where: { id, companyId } });
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete visa status template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
