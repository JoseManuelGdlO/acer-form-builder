import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Form } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const forms = await Form.findAll({
      order: [['created_at', 'DESC']],
    });

    res.json(forms);
  } catch (error) {
    console.error('Get all forms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFormById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const form = await Form.findByPk(id);
    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    res.json(form);
  } catch (error) {
    console.error('Get form by id error:', error);
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

      const form = await Form.create({
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
      const form = await Form.findByPk(id);

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
    const form = await Form.findByPk(id);

    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    await form.destroy();
    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
