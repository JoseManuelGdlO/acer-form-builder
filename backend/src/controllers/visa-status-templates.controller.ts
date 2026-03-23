import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { VisaStatusTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

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

      const template = await VisaStatusTemplate.create({ ...req.body, companyId });
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

      await template.update(req.body);
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
