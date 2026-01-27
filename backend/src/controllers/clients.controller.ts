import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Client, ClientChecklist, ChecklistTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, assignedUserId } = req.query;
    const where: any = {};

    // If user is reviewer, only show assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      where.assignedUserId = req.user.id;
    } else if (assignedUserId) {
      where.assignedUserId = assignedUserId;
    }

    if (status) {
      where.status = status;
    }

    const clients = await Client.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: ClientChecklist,
          as: 'checklistItems',
          include: [
            {
              model: ChecklistTemplate,
              as: 'template',
              where: { isActive: true },
              required: false,
            },
          ],
          required: false,
        },
      ],
    });

    // Get all active checklist templates to include in response
    const activeTemplates = await ChecklistTemplate.findAll({
      where: { isActive: true },
      order: [['order', 'ASC']],
    });

    // Add checklist stats to each client
    const clientsWithStats = clients.map(client => {
      const checklistItems = (client as any).checklistItems || [];
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      return {
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate, // Map of templateId -> { completed: boolean }
      };
    });

    // Include templates info in response
    const response = {
      clients: clientsWithStats,
      templates: activeTemplates.map(t => ({
        id: t.id,
        label: t.label,
        order: t.order,
        isActive: t.isActive,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const client = await Client.findByPk(id);
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Check if reviewer can access this client
    if (req.user && !req.user.roles.includes('super_admin')) {
      if (client.assignedUserId !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    res.json(client);
  } catch (error) {
    console.error('Get client by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClient = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const client = await Client.create(req.body);
      
      // Get checklist stats for the new client
      const checklistItems = await ClientChecklist.findAll({
        where: { clientId: client.id },
        include: [
          {
            model: ChecklistTemplate,
            as: 'template',
            where: { isActive: true },
            required: false,
          },
        ],
      });
      
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      res.status(201).json({
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateClient = [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const client = await Client.findByPk(id);

      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      // Check if reviewer can update this client
      if (req.user && !req.user.roles.includes('super_admin')) {
        if (client.assignedUserId !== req.user.id) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      await client.update(req.body);
      
      // Get checklist stats for the updated client
      const checklistItems = await ClientChecklist.findAll({
        where: { clientId: client.id },
        include: [
          {
            model: ChecklistTemplate,
            as: 'template',
            where: { isActive: true },
            required: false,
          },
        ],
      });
      
      const totalItems = checklistItems.length;
      const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      let checklistStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (totalItems === 0) {
        checklistStatus = 'not_started';
      } else if (completedItems === totalItems) {
        checklistStatus = 'completed';
      } else if (completedItems > 0) {
        checklistStatus = 'in_progress';
      }

      // Map checklist items by template
      const checklistByTemplate: Record<string, { completed: boolean; templateId: string }> = {};
      checklistItems.forEach((item: any) => {
        const templateId = item.template_id || item.templateId || (item.template && item.template.id);
        if (templateId) {
          checklistByTemplate[templateId] = {
            completed: item.is_completed !== undefined ? item.is_completed : item.isCompleted || false,
            templateId: templateId,
          };
        }
      });

      const clientData = client.toJSON();
      res.json({
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
      });
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await Client.findByPk(id);

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    // Check if reviewer can delete this client
    if (req.user && !req.user.roles.includes('super_admin')) {
      if (client.assignedUserId !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    await client.destroy();
    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const where: any = {};

    // If user is reviewer, only count assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      where.assignedUserId = req.user.id;
    }

    const total = await Client.count({ where });
    const active = await Client.count({ where: { ...where, status: 'active' } });
    const inactive = await Client.count({ where: { ...where, status: 'inactive' } });
    const pending = await Client.count({ where: { ...where, status: 'pending' } });

    res.json({
      total,
      active,
      inactive,
      pending,
    });
  } catch (error) {
    console.error('Get client stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
