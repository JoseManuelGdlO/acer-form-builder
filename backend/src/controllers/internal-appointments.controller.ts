import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission, canAccessClientRecord } from '../authorization/policies';
import { Client, InternalAppointment, InternalAppointmentHistory, User } from '../models';
import sequelize from '../config/database';

const serializeAppointment = (appointment: any) => {
  const row = appointment?.toJSON ? appointment.toJSON() : appointment;
  return {
    id: row.id,
    companyId: row.companyId ?? row.company_id,
    clientId: row.clientId ?? row.client_id,
    appointmentDate: row.appointmentDate ?? row.appointment_date,
    appointmentTime: row.appointmentTime ?? row.appointment_time ?? null,
    appointedByUserId: row.appointedByUserId ?? row.appointed_by_user_id,
    officeRole: row.officeRole ?? row.office_role,
    purposeNote: row.purposeNote ?? row.purpose_note,
    status: row.status,
    completedAt: row.completedAt ?? row.completed_at ?? null,
    cancelledAt: row.cancelledAt ?? row.cancelled_at ?? null,
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
    appointedByUser: row.appointedByUser
      ? {
          id: row.appointedByUser.id,
          name: row.appointedByUser.name,
          email: row.appointedByUser.email,
        }
      : null,
  };
};

const writeHistory = async (payload: {
  appointmentId: string;
  companyId: string;
  action: 'created' | 'updated' | 'status_changed' | 'deleted';
  changedByUserId: string;
  before?: unknown;
  after?: unknown;
}) => {
  await InternalAppointmentHistory.create({
    appointmentId: payload.appointmentId,
    companyId: payload.companyId,
    action: payload.action,
    changedByUserId: payload.changedByUserId,
    beforeJson: payload.before ? JSON.stringify(payload.before) : null,
    afterJson: payload.after ? JSON.stringify(payload.after) : null,
  });
};

export const getClientInternalAppointments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id: clientId } = req.params;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'appointments.view') || !canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const appointments = await InternalAppointment.findAll({
      where: { companyId, clientId },
      include: [{ model: User, as: 'appointedByUser', attributes: ['id', 'name', 'email'], required: false }],
      order: [
        ['appointment_date', 'ASC'],
        [sequelize.literal('CASE WHEN appointment_time IS NULL OR appointment_time = \'\' THEN 1 ELSE 0 END'), 'ASC'],
        ['appointment_time', 'ASC'],
        ['created_at', 'ASC'],
      ],
    });
    const today = new Date().toISOString().slice(0, 10);
    const serialized = appointments.map(serializeAppointment);

    res.json({
      upcoming: serialized.filter((a: any) => a.status === 'scheduled' && a.appointmentDate >= today),
      history: serialized.filter((a: any) => a.status !== 'scheduled' || a.appointmentDate < today),
      all: serialized,
    });
  } catch (error) {
    console.error('Get internal appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const optionalTimeValidator = body('appointmentTime')
  .optional({ nullable: true })
  .custom((value: unknown) => {
    if (value === null || value === undefined || value === '') return true;
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  })
  .withMessage('appointmentTime must be HH:mm');

export const createClientInternalAppointment = [
  body('appointmentDate').isISO8601().withMessage('Appointment date must be a valid date'),
  optionalTimeValidator,
  body('officeRole').isIn(['reviewer', 'admin']).withMessage('Office role must be reviewer or admin'),
  body('purposeNote').isString().isLength({ min: 1, max: 1000 }).withMessage('Purpose note is required'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      const { id: clientId } = req.params;
      if (!companyId || !req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const client = await Client.findOne({ where: { id: clientId, companyId } });
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (!hasPermission(req.user.permissions, 'appointments.create') || !canAccessClientRecord(req, client)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const timeRaw = req.body.appointmentTime;
      const appointmentTime =
        typeof timeRaw === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(timeRaw) ? timeRaw : null;

      const appointment = await InternalAppointment.create({
        companyId,
        clientId,
        appointmentDate: req.body.appointmentDate,
        appointmentTime,
        officeRole: req.body.officeRole,
        purposeNote: req.body.purposeNote,
        appointedByUserId: req.user.id,
        status: 'scheduled',
      });
      const created = serializeAppointment(appointment);
      await writeHistory({
        appointmentId: appointment.id,
        companyId,
        action: 'created',
        changedByUserId: req.user.id,
        after: created,
      });
      res.status(201).json(created);
    } catch (error) {
      console.error('Create internal appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateInternalAppointment = [
  body('appointmentDate').optional().isISO8601().withMessage('Appointment date must be a valid date'),
  optionalTimeValidator,
  body('officeRole').optional().isIn(['reviewer', 'admin']).withMessage('Office role must be reviewer or admin'),
  body('purposeNote').optional().isString().isLength({ min: 1, max: 1000 }).withMessage('Purpose note must be valid'),
  body('status').optional().isIn(['scheduled', 'completed', 'cancelled']).withMessage('Invalid status'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId || !req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const { appointmentId } = req.params;
      const appointment = await InternalAppointment.findOne({
        where: { id: appointmentId, companyId },
        include: [{ model: Client, as: 'client', attributes: ['id', 'assignedUserId'] }],
      });
      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }
      const client = (appointment as any).client as Client;
      if (!hasPermission(req.user.permissions, 'appointments.update') || !canAccessClientRecord(req, client)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const previous = serializeAppointment(appointment);
      const updates: any = {};
      if (req.body.appointmentDate !== undefined) updates.appointmentDate = req.body.appointmentDate;
      if (req.body.appointmentTime !== undefined) {
        const t = req.body.appointmentTime;
        updates.appointmentTime =
          t === null || t === ''
            ? null
            : typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)
              ? t
              : null;
      }
      if (req.body.officeRole !== undefined) updates.officeRole = req.body.officeRole;
      if (req.body.purposeNote !== undefined) updates.purposeNote = req.body.purposeNote;
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.status === 'completed') {
        updates.completedAt = new Date();
        updates.cancelledAt = null;
      } else if (req.body.status === 'cancelled') {
        updates.cancelledAt = new Date();
        updates.completedAt = null;
      } else if (req.body.status === 'scheduled') {
        updates.cancelledAt = null;
        updates.completedAt = null;
      }

      await appointment.update(updates);
      const updated = serializeAppointment(appointment);
      await writeHistory({
        appointmentId: appointment.id,
        companyId,
        action: req.body.status !== undefined ? 'status_changed' : 'updated',
        changedByUserId: req.user.id,
        before: previous,
        after: updated,
      });
      res.json(updated);
    } catch (error) {
      console.error('Update internal appointment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteInternalAppointment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId || !req.user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { appointmentId } = req.params;
    const appointment = await InternalAppointment.findOne({
      where: { id: appointmentId, companyId },
      include: [{ model: Client, as: 'client', attributes: ['id', 'assignedUserId'] }],
    });
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    const client = (appointment as any).client as Client;
    if (!hasPermission(req.user.permissions, 'appointments.delete') || !canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    const previous = serializeAppointment(appointment);
    // Registrar historial antes de destroy: si no, el INSERT falla (FK a internal_appointments).
    // Nota: ON DELETE CASCADE en history borra también esta fila al eliminar la cita; si hace falta auditoría persistente de borrados, habría que usar SET NULL o borrado lógico.
    await writeHistory({
      appointmentId,
      companyId,
      action: 'deleted',
      changedByUserId: req.user.id,
      before: previous,
    });
    await appointment.destroy();
    res.json({ message: 'Appointment deleted' });
  } catch (error) {
    console.error('Delete internal appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInternalAppointmentHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { appointmentId } = req.params;
    const appointment = await InternalAppointment.findOne({
      where: { id: appointmentId, companyId },
      include: [{ model: Client, as: 'client', attributes: ['id', 'assignedUserId'] }],
    });
    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    const client = (appointment as any).client as Client;
    if (!hasPermission(req.user?.permissions, 'appointments.view') || !canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const history = await InternalAppointmentHistory.findAll({
      where: { companyId, appointmentId },
      include: [{ model: User, as: 'changedByUser', attributes: ['id', 'name', 'email'], required: false }],
      order: [['created_at', 'DESC']],
    });
    res.json(history);
  } catch (error) {
    console.error('Get internal appointment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
