import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { ClientGroup, Client, ClientGroupMember, FormSubmission, TripGroup, Trip } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission, canViewAllClients } from '../authorization/policies';

async function attachLastSubmissionToClients(clients: any[]): Promise<any[]> {
  if (clients.length === 0) return clients;
  const clientIds = clients.map((c: any) => c.id);
  const submissions = await FormSubmission.findAll({
    where: { clientId: { [Op.in]: clientIds } },
    order: [['submitted_at', 'DESC']],
    attributes: ['clientId', 'formName', 'submitted_at'],
  });
  const lastByClient: Record<string, { formName: string; submittedAt: Date }> = {};
  for (const s of submissions) {
    const cid = (s as any).clientId;
    if (cid && !lastByClient[cid]) {
      const submittedAt = (s as any).submittedAt ?? (s as any).submitted_at;
      lastByClient[cid] = { formName: (s as any).formName, submittedAt };
    }
  }
  return clients.map((c: any) => {
    const data = c.toJSON ? c.toJSON() : c;
    const last = lastByClient[data.id];
    return {
      ...data,
      lastSubmission: last ? { formName: last.formName, submittedAt: last.submittedAt } : null,
    };
  });
}

const buildWhere = (req: AuthRequest): { assignedUserId?: string } => {
  const where: { assignedUserId?: string } = {};
  if (req.user && !canViewAllClients(req)) {
    where.assignedUserId = req.user.id;
  }
  return where;
};

export const getAllGroups = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!hasPermission(req.user!.permissions, 'groups.view')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const where = buildWhere(req);
    const groups = await ClientGroup.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Client,
          as: 'clients',
          through: { attributes: [] },
          attributes: ['id', 'name', 'email', 'phone', 'status'],
        },
      ],
    });
    const groupIds = groups.map(g => g.id);
    const tripGroups = await TripGroup.findAll({
      where: { groupId: groupIds },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTripsByGroupId: Record<string, { id: string; title: string }[]> = {};
    for (const tg of tripGroups) {
      const gid = tg.groupId;
      const trip = (tg as any).trip;
      if (!trip) continue;
      if (!assignedTripsByGroupId[gid]) assignedTripsByGroupId[gid] = [];
      assignedTripsByGroupId[gid].push({ id: trip.id, title: trip.title });
    }

    const groupsJson = groups.map(g => g.toJSON()) as any[];
    for (const g of groupsJson) {
      g.clients = await attachLastSubmissionToClients(g.clients || []);
      g.assignedTrips = assignedTripsByGroupId[g.id] || [];
    }
    res.json(groupsJson);
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGroupById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!hasPermission(req.user!.permissions, 'groups.view')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const { id } = req.params;
    const where = buildWhere(req);
    const group = await ClientGroup.findOne({
      where: { id, ...where },
      include: [
        {
          model: Client,
          as: 'clients',
          through: { attributes: [] },
        },
      ],
    });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    const tripGroups = await TripGroup.findAll({
      where: { groupId: id },
      include: [{ model: Trip, as: 'trip', attributes: ['id', 'title'] }],
    });
    const assignedTrips = tripGroups
      .map(tg => (tg as any).trip)
      .filter(Boolean)
      .map((t: any) => ({ id: t.id, title: t.title }));

    const groupJson = group.toJSON() as any;
    groupJson.clients = await attachLastSubmissionToClients(groupJson.clients || []);
    groupJson.assignedTrips = assignedTrips;
    res.json(groupJson);
  } catch (error) {
    console.error('Get group by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGroup = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('clientIds').optional().isArray(),
  body('clientIds.*').optional().isUUID(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      if (!hasPermission(req.user!.permissions, 'groups.create')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      const { title, clientIds } = req.body;
      const createPayload: { title: string; assignedUserId?: string } = { title };
      if (req.user && !canViewAllClients(req)) {
        createPayload.assignedUserId = req.user.id;
      }
      const group = await ClientGroup.create(createPayload);
      if (Array.isArray(clientIds) && clientIds.length > 0) {
        await ClientGroupMember.bulkCreate(
          clientIds.map((clientId: string) => ({ groupId: group.id, clientId }))
        );
      }
      const withClients = await ClientGroup.findByPk(group.id, {
        include: [
          {
            model: Client,
            as: 'clients',
            through: { attributes: [] },
          },
        ],
      });
      const createdJson = withClients?.toJSON() as any;
      if (createdJson?.clients) createdJson.clients = await attachLastSubmissionToClients(createdJson.clients);
      res.status(201).json(createdJson || withClients);
    } catch (error) {
      console.error('Create group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateGroup = [
  body('title').optional().notEmpty().trim(),
  body('clientIds').optional().isArray(),
  body('clientIds.*').optional().isUUID(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      if (!hasPermission(req.user!.permissions, 'groups.update')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      const { id } = req.params;
      const where = buildWhere(req);
      const group = await ClientGroup.findOne({ where: { id, ...where } });
      if (!group) {
        res.status(404).json({ error: 'Group not found' });
        return;
      }
      if (req.body.title !== undefined) {
        await group.update({ title: req.body.title });
      }
      if (req.body.clientIds !== undefined) {
        await ClientGroupMember.destroy({ where: { groupId: id } });
        const clientIds = Array.isArray(req.body.clientIds) ? req.body.clientIds : [];
        if (clientIds.length > 0) {
          await ClientGroupMember.bulkCreate(
            clientIds.map((clientId: string) => ({ groupId: id, clientId }))
          );
        }
      }
      const withClients = await ClientGroup.findByPk(id, {
        include: [
          {
            model: Client,
            as: 'clients',
            through: { attributes: [] },
          },
        ],
      });
      const updatedJson = withClients?.toJSON() as any;
      if (updatedJson?.clients) updatedJson.clients = await attachLastSubmissionToClients(updatedJson.clients);
      res.json(updatedJson || withClients);
    } catch (error) {
      console.error('Update group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteGroup = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!hasPermission(req.user!.permissions, 'groups.delete')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const { id } = req.params;
    const where = buildWhere(req);
    const group = await ClientGroup.findOne({ where: { id, ...where } });
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }
    await group.destroy();
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
