import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ChecklistTemplate, ClientChecklist, Client } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

// Templates
export const getAllTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const templates = await ChecklistTemplate.findAll({
      where: { companyId },
      order: [['order', 'ASC']],
    });
    res.json(templates);
  } catch (error) {
    console.error('Get all templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTemplate = [
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

      const template = await ChecklistTemplate.create({ ...req.body, companyId });
      res.status(201).json(template);
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateTemplate = [
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
      const template = await ChecklistTemplate.findOne({ where: { id, companyId } });

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      await template.update(req.body);
      res.json(template);
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const template = await ChecklistTemplate.findOne({ where: { id, companyId } });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Client Checklist Items
export const getClientChecklist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;

    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if reviewer can access this client and client belongs to company
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get all active checklist templates for this company
    const activeTemplates = await ChecklistTemplate.findAll({
      where: { companyId, isActive: true },
      order: [['order', 'ASC']],
    });

    // Get existing checklist items for this client
    const existingChecklist = await ClientChecklist.findAll({
      where: { clientId },
      include: [
        {
          model: ChecklistTemplate,
          as: 'template',
        },
      ],
    });

    // Create checklist items for templates that don't exist yet
    const existingTemplateIds = existingChecklist.map(item => item.templateId);
    const missingTemplates = activeTemplates.filter(template => !existingTemplateIds.includes(template.id));

    if (missingTemplates.length > 0) {
      await ClientChecklist.bulkCreate(
        missingTemplates.map(template => ({
          companyId,
          clientId,
          templateId: template.id,
          isCompleted: false,
        }))
      );
    }

    // Return all checklist items (including newly created ones)
    const checklist = await ClientChecklist.findAll({
      where: { clientId },
      include: [
        {
          model: ChecklistTemplate,
          as: 'template',
        },
      ],
      order: [[{ model: ChecklistTemplate, as: 'template' }, 'order', 'ASC']],
    });

    res.json(checklist);
  } catch (error) {
    console.error('Get client checklist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateChecklistItem = [
  body('isCompleted').isBoolean(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { clientId, itemId } = req.params;
      const { isCompleted } = req.body;

      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const client = await Client.findOne({ where: { id: clientId, companyId } });
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const item = await ClientChecklist.findOne({
        where: { id: itemId, clientId, companyId },
      });

      if (!item) {
        res.status(404).json({ error: 'Checklist item not found' });
        return;
      }

      await item.update({
        isCompleted,
        completedAt: isCompleted ? new Date() : (null as any),
      });

      res.json(item);
    } catch (error) {
      console.error('Update checklist item error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];
