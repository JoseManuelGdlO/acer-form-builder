import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FAQ } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllFAQs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { isActive } = req.query;
    const where: any = { companyId };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const faqs = await FAQ.findAll({
      where,
      order: [['order', 'ASC']],
    });

    // Always return an array (never an object) for consistent API contract
    res.json(Array.isArray(faqs) ? faqs : []);
  } catch (error) {
    console.error('Get all FAQs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFAQById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const faq = await FAQ.findOne({ where: { id, companyId } });

    if (!faq) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }

    res.json(faq);
  } catch (error) {
    console.error('Get FAQ by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createFAQ = [
  body('question').notEmpty().withMessage('Question is required'),
  body('answer').notEmpty().withMessage('Answer is required'),
  body('order').optional().isInt(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { question, answer, category, order } = req.body;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const faq = await FAQ.create({
        companyId,
        question,
        answer,
        isActive: true,
        order: order != null ? Number(order) : 0,
        ...(category != null && category !== '' && { category }),
      });
      res.status(201).json(faq);
    } catch (error) {
      console.error('Create FAQ error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateFAQ = [
  body('question').optional().notEmpty(),
  body('answer').optional().notEmpty(),
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
      const faq = await FAQ.findOne({ where: { id, companyId } });

      if (!faq) {
        res.status(404).json({ error: 'FAQ not found' });
        return;
      }

      await faq.update(req.body);
      res.json(faq);
    } catch (error) {
      console.error('Update FAQ error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteFAQ = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const faq = await FAQ.findOne({ where: { id, companyId } });

    if (!faq) {
      res.status(404).json({ error: 'FAQ not found' });
      return;
    }

    await faq.destroy();
    res.json({ message: 'FAQ deleted successfully' });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
