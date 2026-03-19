import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { fn, col } from 'sequelize';
import { Client, ClientChecklist, ChecklistTemplate, ClientAmountDueLog, ClientPaymentDeletedLog, ClientPayment, User, TripParticipant, Trip } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllClients = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { status, assignedUserId } = req.query;
    const where: any = { companyId };

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
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
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

    // Get all active checklist templates for this company
    const activeTemplates = await ChecklistTemplate.findAll({
      where: { companyId, isActive: true },
      order: [['order', 'ASC']],
    });

    const clientIds = clients.map(c => c.id);

    // Trips each client is assigned to (for "En viaje(s)" badge)
    const tripParticipations = await TripParticipant.findAll({
      where: { clientId: clientIds },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTripsByClientId: Record<string, { id: string; title: string }[]> = {};
    for (const tp of tripParticipations) {
      const cid = tp.clientId;
      const trip = (tp as any).trip;
      if (!trip) continue;
      if (!assignedTripsByClientId[cid]) assignedTripsByClientId[cid] = [];
      assignedTripsByClientId[cid].push({ id: trip.id, title: trip.title });
    }

    // Sum of payments per client (total pagado)
    const paymentSums = await ClientPayment.findAll({
      where: { companyId, clientId: clientIds },
      attributes: ['clientId', [fn('SUM', col('amount')), 'totalPaid']],
      group: ['clientId'],
      raw: true,
    });
    const totalPaidByClientId: Record<string, number> = {};
    paymentSums.forEach((row: any) => {
      const id = row.clientId || row.client_id;
      if (id) totalPaidByClientId[id] = parseFloat(row.totalPaid || '0') || 0;
    });

    // Add checklist stats and payment totals to each client
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
      const totalPaid = totalPaidByClientId[client.id] ?? 0;
      return {
        ...clientData,
        checklistProgress: progress,
        checklistStatus,
        checklistCompleted: completedItems,
        checklistTotal: totalItems,
        checklistByTemplate,
        totalPaid,
        assignedTrips: assignedTripsByClientId[client.id] || [],
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
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const client = await Client.findOne({
      where: { id, companyId },
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false },
      ],
    });
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

    const participations = await TripParticipant.findAll({
      where: { clientId: id },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTrips = participations
      .map(p => (p as any).trip)
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, title: t.title }));

    const clientJson = client.toJSON();
    (clientJson as any).assignedTrips = assignedTrips;
    res.json(clientJson);
  } catch (error) {
    console.error('Get client by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientAmountDueHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Solo administradores pueden ver el historial de cambios del total a pagar' });
      return;
    }
    const { id: clientId } = req.params;
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
    const logs = await ClientAmountDueLog.findAll({
      where: { clientId, companyId },
      include: [{ model: User, as: 'changedByUser', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch (error) {
    console.error('Get client amount due history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientPaymentDeletedHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Solo administradores pueden ver el historial de pagos eliminados' });
      return;
    }
    const { id: clientId } = req.params;
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
    const logs = await ClientPaymentDeletedLog.findAll({
      where: { clientId, companyId },
      include: [{ model: User, as: 'deletedByUser', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch (error) {
    console.error('Get client payment deleted history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClient = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
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

      const normalizedPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
      if (normalizedPhone !== undefined) {
        req.body.phone = normalizedPhone;
      }

      if (normalizedPhone) {
        const existingClient = await Client.findOne({ where: { companyId, phone: normalizedPhone } });
        if (existingClient) {
          res.status(200).json({
            message: 'Cliente ya existe',
            client: existingClient,
          });
          return;
        }
      }

      const client = await Client.create({ ...req.body, companyId });
      
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
      const err = error as { name?: string; fields?: Record<string, unknown> };
      if (err?.name === 'SequelizeUniqueConstraintError' && err?.fields?.phone) {
        const companyId = req.user?.companyId;
        const normalizedPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
        if (companyId && normalizedPhone) {
          const existingClient = await Client.findOne({ where: { companyId, phone: normalizedPhone } });
          if (existingClient) {
            res.status(200).json({
              message: 'Cliente ya existe',
              client: existingClient,
            });
            return;
          }
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateClient = [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive', 'pending']),
  body('totalAmountDue').optional({ values: 'null' }).custom((val) => val === null || val === undefined || (typeof val === 'number' && !Number.isNaN(val) && val >= 0)).withMessage('Total amount due must be a non-negative number or null'),
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
      const client = await Client.findOne({ where: { id, companyId } });

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

      const updates: Record<string, unknown> = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.phone !== undefined) updates.phone = req.body.phone;
      if (req.body.address !== undefined) updates.address = req.body.address;
      if (req.body.notes !== undefined) updates.notes = req.body.notes;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.assignedUserId !== undefined && req.user?.roles.includes('super_admin')) {
        updates.assignedUserId = req.body.assignedUserId || null;
      }
      if (req.body.totalAmountDue !== undefined && req.user?.roles.includes('super_admin')) {
        updates.totalAmountDue = req.body.totalAmountDue;
      }

      const previousTotalAmountDue = client.totalAmountDue != null ? Number(client.totalAmountDue) : null;
      await client.update(updates);
      await client.reload({
        include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false }],
      });
      if (req.body.totalAmountDue !== undefined) {
        const newVal = req.body.totalAmountDue === null || req.body.totalAmountDue === undefined
          ? null
          : Number(req.body.totalAmountDue);
        await ClientAmountDueLog.create({
          companyId,
          clientId: client.id,
          previousValue: previousTotalAmountDue,
          newValue: newVal,
          changedBy: req.user?.id,
        });
      }

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
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id, companyId } });

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
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const where: any = { companyId };

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
