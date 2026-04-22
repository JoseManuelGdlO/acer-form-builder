import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Op, fn, col } from 'sequelize';
import {
  Trip,
  TripCompany,
  TripInvitation,
  TripParticipant,
  TripGroup,
  TripSeatAssignment,
  TripChangeLog,
  ClientPayment,
  BusTemplate,
  Client,
  ClientGroupMember,
  Company,
  User,
  Branch,
} from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission } from '../authorization/policies';

function parseBoolVisa(v: unknown): boolean {
  return v === true || v === 'true';
}

function validateVisaTripDates(d: {
  casDepartureDate: string | null | undefined;
  casReturnDate: string | null | undefined;
  consulateDepartureDate: string | null | undefined;
  consulateReturnDate: string | null | undefined;
}): string | null {
  const { casDepartureDate, casReturnDate, consulateDepartureDate, consulateReturnDate } = d;
  if (!casDepartureDate || !casReturnDate || !consulateDepartureDate || !consulateReturnDate) {
    return 'Las cuatro fechas del viaje de visas son obligatorias';
  }
  if (casDepartureDate > casReturnDate) {
    return 'CAS: la fecha de regreso debe ser posterior o igual a la de salida';
  }
  if (consulateDepartureDate > consulateReturnDate) {
    return 'Consulado: la fecha de regreso debe ser posterior o igual a la de salida';
  }
  if (casReturnDate > consulateDepartureDate) {
    return 'La salida al consulado debe ser el mismo día o posterior al regreso del CAS';
  }
  return null;
}

function requireTripPermission(req: AuthRequest, res: Response, key: string): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  if (!hasPermission(req.user.permissions, key)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

async function ensureUserCompanyInTrip(req: AuthRequest, tripId: string): Promise<boolean> {
  const companyId = req.user?.companyId;
  if (!companyId) return false;
  const link = await TripCompany.findOne({ where: { tripId, companyId } });
  return !!link;
}

async function logTripChange(
  tripId: string,
  userId: string,
  action: string,
  opts?: { entityType?: string; entityId?: string; fieldName?: string; oldValue?: string | null; newValue?: string | null }
): Promise<void> {
  await TripChangeLog.create({
    tripId,
    userId,
    action,
    entityType: opts?.entityType ?? null,
    entityId: opts?.entityId ?? null,
    fieldName: opts?.fieldName ?? null,
    oldValue: opts?.oldValue ?? null,
    newValue: opts?.newValue ?? null,
  });
}

export const getAllTrips = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.view')) return;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const tripIds = (
      await TripCompany.findAll({
        where: { companyId },
        attributes: ['tripId'],
        raw: true,
      })
    ).map(r => r.tripId);
    const trips = await Trip.findAll({
      where: { id: { [Op.in]: tripIds } },
      order: [['departure_date', 'DESC']],
      include: [
        { model: TripParticipant, as: 'participants', attributes: ['id'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] },
      ],
    });
    const list = trips.map(t => {
      const j = t.toJSON() as any;
      j.participantCount = (j.participants || []).length;
      delete j.participants;
      return j;
    });
    res.json(list);
  } catch (error) {
    console.error('Get all trips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTripById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.view')) return;
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const trip = await Trip.findByPk(id, {
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: BusTemplate, as: 'busTemplate', attributes: ['id', 'name', 'totalSeats', 'rows', 'bathroomPosition', 'floors', 'stairsPosition', 'seatLabels', 'layout'] },
        {
          model: TripParticipant,
          as: 'participants',
          include: [
            {
              model: Client,
              as: 'client',
              include: [
                { model: Company, as: 'company', attributes: ['id', 'name'] },
                {
                  model: User,
                  as: 'assignedUser',
                  attributes: ['id', 'name', 'email'],
                  required: false,
                  include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }],
                },
              ],
              attributes: ['id', 'name', 'email', 'phone', 'companyId', 'totalAmountDue', 'parentClientId', 'assignedUserId'],
            },
          ],
        },
        {
          model: TripSeatAssignment,
          as: 'seatAssignments',
          include: [
            {
              model: Client,
              as: 'client',
              include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
              attributes: ['id', 'name', 'companyId'],
            },
          ],
        },
        {
          model: TripCompany,
          as: 'tripCompanies',
          include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }],
        },
      ],
    });
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const j = trip.toJSON() as any;
    // Strip totalAmountDue for participants from other companies; saldo pendiente solo para titulares
    if (j.participants) {
      j.participants = j.participants.map((p: any) => {
        const client = p.client || {};
        if (client.companyId !== companyId && client.totalAmountDue !== undefined) {
          const out = { ...p };
          if (out.client) out.client = { ...out.client, totalAmountDue: null };
          return out;
        }
        return p;
      });
      const ownIds = (j.participants as any[])
        .map((p) => p.client)
        .filter((c: any) => c?.companyId === companyId)
        .map((c: any) => c.id)
        .filter(Boolean);
      const uniqueOwn = [...new Set(ownIds)] as string[];
      let paidByClientId: Record<string, number> = {};
      if (uniqueOwn.length > 0) {
        const sums = await ClientPayment.findAll({
          attributes: ['clientId', [fn('SUM', col('amount')), 'totalPaid']],
          where: { companyId, clientId: { [Op.in]: uniqueOwn } },
          group: ['clientId'],
          raw: true,
        });
        paidByClientId = Object.fromEntries(
          (sums as any[]).map((row) => {
            const cid = row.clientId || row.client_id;
            return [cid, parseFloat(String(row.totalPaid ?? '0')) || 0] as const;
          }).filter((e) => e[0])
        );
      }
      j.participants = (j.participants as any[]).map((p: any) => {
        const c = p.client;
        if (!c || c.companyId !== companyId) return p;
        if (c.parentClientId) {
          return {
            ...p,
            client: {
              ...c,
              totalAmountDue: null,
              tripBalanceDue: null,
            },
          };
        }
        const totalPaid = paidByClientId[c.id] ?? 0;
        const due = c.totalAmountDue != null ? Number(c.totalAmountDue) : null;
        const tripBalanceDue = due != null ? Math.max(0, due - totalPaid) : null;
        return { ...p, client: { ...c, tripBalanceDue } };
      });
    }
    j.sharedCompanies = (j.tripCompanies || [])
      .filter((tc: any) => tc.companyId !== (trip as any).companyId)
      .map((tc: any) => tc.company && { id: tc.company.id, name: tc.company.name })
      .filter(Boolean);
    delete j.tripCompanies;
    res.json(j);
  } catch (error) {
    console.error('Get trip by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTrip = [
  body('title').notEmpty().trim().withMessage('Title is required'),
  body('departureDate').optional().notEmpty(),
  body('returnDate').optional().notEmpty(),
  body('totalSeats').isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
  body('destination').optional().trim(),
  body('notes').optional().trim(),
  body('busTemplateId').optional().isUUID(),
  body('invitedCompanyIds').optional().isArray(),
  body('invitedCompanyIds.*').optional().isUUID(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireTripPermission(req, res, 'trips.create')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user!.companyId;
      const {
        title,
        totalSeats,
        destination,
        notes,
        busTemplateId,
        invitedCompanyIds,
        isVisaTrip: isVisaTripBody,
        casDepartureDate,
        casReturnDate,
        consulateDepartureDate,
        consulateReturnDate,
      } = req.body;
      const isVisa = parseBoolVisa(isVisaTripBody);
      let departureDate: string = req.body.departureDate;
      let returnDate: string = req.body.returnDate;
      let casDep: string | null = null;
      let casRet: string | null = null;
      let conDep: string | null = null;
      let conRet: string | null = null;
      if (isVisa) {
        casDep = casDepartureDate;
        casRet = casReturnDate;
        conDep = consulateDepartureDate;
        conRet = consulateReturnDate;
        const visaErr = validateVisaTripDates({
          casDepartureDate: casDep,
          casReturnDate: casRet,
          consulateDepartureDate: conDep,
          consulateReturnDate: conRet,
        });
        if (visaErr) {
          res.status(400).json({ error: visaErr });
          return;
        }
        departureDate = casDep!;
        returnDate = conRet!;
      } else {
        if (!departureDate || !returnDate) {
          res.status(400).json({ error: 'Fechas de partida y regreso son obligatorias' });
          return;
        }
        if (returnDate < departureDate) {
          res.status(400).json({ error: 'La fecha de regreso debe ser posterior o igual a la de partida' });
          return;
        }
      }
      let busTemplateIdToSet: string | null = null;
      if (busTemplateId) {
        const bt = await BusTemplate.findOne({ where: { id: busTemplateId, companyId } });
        if (!bt) {
          res.status(400).json({ error: 'Plantilla de camión no encontrada o no pertenece a tu compañía' });
          return;
        }
        busTemplateIdToSet = bt.id;
      }
      const trip = await Trip.create({
        companyId,
        title,
        departureDate,
        returnDate,
        isVisaTrip: isVisa,
        casDepartureDate: isVisa ? casDep : null,
        casReturnDate: isVisa ? casRet : null,
        consulateDepartureDate: isVisa ? conDep : null,
        consulateReturnDate: isVisa ? conRet : null,
        totalSeats: Number(totalSeats),
        destination: destination || null,
        notes: notes || null,
        busTemplateId: busTemplateIdToSet,
      });
      await TripCompany.create({ tripId: trip.id, companyId });
      const toInvite = Array.isArray(invitedCompanyIds)
        ? invitedCompanyIds.filter((id: string) => id !== companyId)
        : [];
      const existingCompanies = await Company.findAll({
        where: { id: { [Op.in]: toInvite } },
        attributes: ['id'],
      });
      const validIds = existingCompanies.map(c => c.id);
      for (const cid of validIds) {
        await TripInvitation.create({
          tripId: trip.id,
          invitedCompanyId: cid,
          invitedBy: req.user!.id,
          status: 'pending',
        });
      }
      await logTripChange(trip.id, req.user!.id, 'trip_created', {
        newValue: JSON.stringify({
          title,
          departureDate,
          returnDate,
          totalSeats,
          isVisaTrip: isVisa,
          casDepartureDate: casDep,
          casReturnDate: casRet,
          consulateDepartureDate: conDep,
          consulateReturnDate: conRet,
        }),
      });
      for (const cid of validIds) {
        await logTripChange(trip.id, req.user!.id, 'invitation_sent', { newValue: cid });
      }
      const withIncludes = await Trip.findByPk(trip.id, {
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: BusTemplate, as: 'busTemplate', attributes: ['id', 'name', 'totalSeats', 'rows', 'bathroomPosition', 'floors', 'stairsPosition', 'seatLabels', 'layout'] },
          { model: TripCompany, as: 'tripCompanies', include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }] },
        ],
      });
      const j = withIncludes?.toJSON() as any;
      if (j) j.sharedCompanies = (j.tripCompanies || []).map((tc: any) => tc.company).filter(Boolean);
      if (j) delete j.tripCompanies;
      res.status(201).json(j || trip);
    } catch (error) {
      console.error('Create trip error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateTrip = [
  body('title').optional().notEmpty().trim(),
  body('departureDate').optional().notEmpty(),
  body('returnDate').optional().notEmpty(),
  body('totalSeats').optional().isInt({ min: 1 }),
  body('destination').optional().trim(),
  body('notes').optional().trim(),
  body('busTemplateId').optional({ nullable: true }).isUUID(),
  body('invitedCompanyIds').optional().isArray(),
  body('invitedCompanyIds.*').optional().isUUID(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireTripPermission(req, res, 'trips.update')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const inTrip = await ensureUserCompanyInTrip(req, id);
      if (!inTrip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const trip = await Trip.findByPk(id);
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const t = trip as any;
      const finalIsVisa =
        req.body.isVisaTrip !== undefined ? parseBoolVisa(req.body.isVisaTrip) : Boolean(t.isVisaTrip);

      const updates: Record<string, any> = {};
      const fieldsNoDates = ['title', 'totalSeats', 'destination', 'notes'] as const;
      for (const f of fieldsNoDates) {
        if (req.body[f] !== undefined) {
          const oldVal = t[f];
          let newVal = req.body[f];
          if (f === 'totalSeats') newVal = Number(newVal);
          if (f === 'destination' || f === 'notes') newVal = newVal === '' ? null : newVal;
          (updates as any)[f] = newVal;
          await logTripChange(id, req.user!.id, 'trip_updated', {
            fieldName: f,
            oldValue: oldVal != null ? String(oldVal) : null,
            newValue: newVal != null ? String(newVal) : null,
          });
        }
      }

      if (finalIsVisa) {
        const casD = req.body.casDepartureDate !== undefined ? req.body.casDepartureDate : t.casDepartureDate;
        const casR = req.body.casReturnDate !== undefined ? req.body.casReturnDate : t.casReturnDate;
        const conD = req.body.consulateDepartureDate !== undefined ? req.body.consulateDepartureDate : t.consulateDepartureDate;
        const conR = req.body.consulateReturnDate !== undefined ? req.body.consulateReturnDate : t.consulateReturnDate;
        const visaErr = validateVisaTripDates({
          casDepartureDate: casD,
          casReturnDate: casR,
          consulateDepartureDate: conD,
          consulateReturnDate: conR,
        });
        if (visaErr) {
          res.status(400).json({ error: visaErr });
          return;
        }
        const visaPatch = {
          isVisaTrip: true,
          casDepartureDate: casD,
          casReturnDate: casR,
          consulateDepartureDate: conD,
          consulateReturnDate: conR,
          departureDate: casD,
          returnDate: conR,
        };
        for (const [key, newVal] of Object.entries(visaPatch)) {
          const oldVal = t[key];
          if (oldVal !== newVal && (oldVal != null || newVal != null)) {
            await logTripChange(id, req.user!.id, 'trip_updated', {
              fieldName: key,
              oldValue: oldVal != null ? String(oldVal) : null,
              newValue: newVal != null ? String(newVal) : null,
            });
          }
          (updates as any)[key] = newVal;
        }
      } else {
        if (req.body.isVisaTrip !== undefined && !parseBoolVisa(req.body.isVisaTrip)) {
          for (const key of ['casDepartureDate', 'casReturnDate', 'consulateDepartureDate', 'consulateReturnDate'] as const) {
            if (t[key] != null) {
              await logTripChange(id, req.user!.id, 'trip_updated', {
                fieldName: key,
                oldValue: String(t[key]),
                newValue: '',
              });
            }
          }
          updates.isVisaTrip = false;
          updates.casDepartureDate = null;
          updates.casReturnDate = null;
          updates.consulateDepartureDate = null;
          updates.consulateReturnDate = null;
        }
        const dep = req.body.departureDate !== undefined ? req.body.departureDate : t.departureDate;
        const ret = req.body.returnDate !== undefined ? req.body.returnDate : t.returnDate;
        if (req.body.departureDate !== undefined || req.body.returnDate !== undefined || (req.body.isVisaTrip !== undefined && !finalIsVisa)) {
          if (!dep || !ret) {
            res.status(400).json({ error: 'Fechas de partida y regreso son obligatorias' });
            return;
          }
          if (ret < dep) {
            res.status(400).json({ error: 'La fecha de regreso debe ser posterior o igual a la de partida' });
            return;
          }
          if (req.body.departureDate !== undefined && String(t.departureDate) !== String(dep)) {
            await logTripChange(id, req.user!.id, 'trip_updated', {
              fieldName: 'departureDate',
              oldValue: t.departureDate != null ? String(t.departureDate) : null,
              newValue: String(dep),
            });
            updates.departureDate = dep;
          }
          if (req.body.returnDate !== undefined && String(t.returnDate) !== String(ret)) {
            await logTripChange(id, req.user!.id, 'trip_updated', {
              fieldName: 'returnDate',
              oldValue: t.returnDate != null ? String(t.returnDate) : null,
              newValue: String(ret),
            });
            updates.returnDate = ret;
          }
          if (req.body.isVisaTrip !== undefined && !finalIsVisa && req.body.departureDate === undefined && req.body.returnDate === undefined) {
            updates.departureDate = dep;
            updates.returnDate = ret;
          }
        }
      }
      if (req.body.totalSeats !== undefined) {
        const maxSeat = (await TripSeatAssignment.max('seatNumber', { where: { tripId: id } })) as number | null;
        if (typeof maxSeat === 'number' && Number(req.body.totalSeats) < maxSeat) {
          res.status(400).json({ error: 'totalSeats no puede ser menor que el asiento máximo ya asignado. Reinicia las asignaciones primero.' });
          return;
        }
      }
      if (req.body.busTemplateId !== undefined) {
        const busTemplateIdVal = req.body.busTemplateId === null || req.body.busTemplateId === '' ? null : req.body.busTemplateId;
        if (busTemplateIdVal) {
          const bt = await BusTemplate.findOne({ where: { id: busTemplateIdVal, companyId } });
          if (!bt) {
            res.status(400).json({ error: 'Plantilla de camión no encontrada o no pertenece a tu compañía' });
            return;
          }
          updates.busTemplateId = bt.id;
        } else {
          updates.busTemplateId = null;
        }
      }
      if (Object.keys(updates).length > 0) await trip.update(updates);
      if (req.body.invitedCompanyIds !== undefined) {
        const existing = await TripCompany.findAll({ where: { tripId: id }, attributes: ['companyId'] });
        const existingIds = new Set(existing.map(e => e.companyId));
        const existingInv = await TripInvitation.findAll({
          where: { tripId: id, status: 'pending' },
          attributes: ['invitedCompanyId'],
        });
        const invitedSet = new Set(existingInv.map(i => i.invitedCompanyId));
        const toInvite = (req.body.invitedCompanyIds as string[]).filter(
          (cid: string) => cid !== (trip as any).companyId && !existingIds.has(cid) && !invitedSet.has(cid)
        );
        const companies = await Company.findAll({ where: { id: { [Op.in]: toInvite } }, attributes: ['id'] });
        for (const c of companies) {
          await TripInvitation.create({
            tripId: id,
            invitedCompanyId: c.id,
            invitedBy: req.user!.id,
            status: 'pending',
          });
          await logTripChange(id, req.user!.id, 'invitation_sent', { newValue: c.id });
        }
      }
      const updated = await Trip.findByPk(id, {
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: BusTemplate, as: 'busTemplate', attributes: ['id', 'name', 'totalSeats', 'rows', 'bathroomPosition', 'floors', 'stairsPosition', 'seatLabels', 'layout'] },
          { model: TripCompany, as: 'tripCompanies', include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }] },
        ],
      });
      const j = updated?.toJSON() as any;
      if (j) j.sharedCompanies = (j.tripCompanies || []).map((tc: any) => tc.company).filter(Boolean);
      if (j) delete j.tripCompanies;
      res.json(j || updated);
    } catch (error) {
      console.error('Update trip error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.delete')) return;
    const { id } = req.params;
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const trip = await Trip.findByPk(id);
    if (!trip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    await trip.destroy();
    res.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addParticipants = [
  body('clientIds').optional().isArray(),
  body('clientIds.*').optional().isUUID(),
  body('groupIds').optional().isArray(),
  body('groupIds.*').optional().isUUID(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireTripPermission(req, res, 'trips.participants_manage')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { id } = req.params;
      const companyId = req.user!.companyId;
      const inTrip = await ensureUserCompanyInTrip(req, id);
      if (!inTrip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const trip = await Trip.findByPk(id);
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const currentCount = await TripParticipant.count({ where: { tripId: id } });
      const totalSeats = (trip as any).totalSeats;
      const clientIds = Array.isArray(req.body.clientIds) ? req.body.clientIds : [];
      const groupIds = Array.isArray(req.body.groupIds) ? req.body.groupIds : [];
      let toAdd: string[] = [...clientIds];
      for (const gid of groupIds) {
        const members = await ClientGroupMember.findAll({ where: { groupId: gid }, attributes: ['clientId'] });
        const gClientIds = members.map(m => m.clientId);
        if (gClientIds.length > 0) {
          const clientsInGroup = await Client.findAll({ where: { id: { [Op.in]: gClientIds } }, attributes: ['id', 'companyId'] });
          const allSameCompany = clientsInGroup.every((c: any) => c.companyId === companyId);
          if (!allSameCompany || clientsInGroup.length !== gClientIds.length) {
            res.status(400).json({ error: 'Solo puedes añadir grupos cuyos miembros sean de tu compañía' });
            return;
          }
        }
        toAdd = toAdd.concat(gClientIds);
        const alreadyLinked = await TripGroup.findOne({ where: { tripId: id, groupId: gid } });
        if (!alreadyLinked) await TripGroup.create({ tripId: id, groupId: gid });
      }
      if (toAdd.length > 0) {
        const selectedClients = await Client.findAll({
          where: { id: { [Op.in]: toAdd }, companyId },
          attributes: ['id', 'parentClientId'],
        });
        if (selectedClients.length !== toAdd.length) {
          res.status(400).json({ error: 'Solo puedes añadir clientes de tu compañía' });
          return;
        }
        const selectedIds = selectedClients.map(c => c.id);
        const children = await Client.findAll({
          where: { parentClientId: { [Op.in]: selectedIds }, companyId },
          attributes: ['id'],
        });
        toAdd = toAdd.concat(children.map(c => c.id));
      }
      toAdd = [...new Set(toAdd)];
      for (const cid of toAdd) {
        const client = await Client.findByPk(cid);
        if (!client || (client as any).companyId !== companyId) {
          res.status(400).json({ error: 'Solo puedes añadir clientes de tu compañía' });
          return;
        }
      }
      const existing = await TripParticipant.findAll({ where: { tripId: id }, attributes: ['clientId'] });
      const existingSet = new Set(existing.map(e => e.clientId));
      const newClients = toAdd.filter(cid => !existingSet.has(cid));
      if (currentCount + newClients.length > totalSeats) {
        res.status(400).json({ error: 'Se ha alcanzado el límite de plazas' });
        return;
      }
      for (const cid of newClients) {
        await TripParticipant.create({ tripId: id, clientId: cid });
      }
      await logTripChange(id, req.user!.id, 'participant_added', {
        newValue: JSON.stringify({ clientIds: newClients, groupIds }),
      });
      const tripWithParticipants = await Trip.findByPk(id, {
        include: [
          {
            model: TripParticipant,
            as: 'participants',
            include: [
              {
                model: Client,
                as: 'client',
                include: [
                  { model: Company, as: 'company', attributes: ['id', 'name'] },
                  {
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name', 'email'],
                    required: false,
                    include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'], required: false }],
                  },
                ],
                attributes: ['id', 'name', 'email', 'phone', 'companyId', 'totalAmountDue', 'parentClientId', 'assignedUserId'],
              },
            ],
          },
        ],
      });
      res.json(tripWithParticipants);
    } catch (error) {
      console.error('Add participants error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const removeParticipant = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.office_admin')) return;
    const { id, clientId } = req.params;
    const companyId = req.user!.companyId;
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const participant = await TripParticipant.findOne({ where: { tripId: id, clientId } });
    if (!participant) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }
    const client = await Client.findByPk(clientId);
    if (client && (client as any).companyId !== companyId) {
      res.status(403).json({ error: 'Solo puedes quitar participantes de tu compañía' });
      return;
    }
    await TripSeatAssignment.destroy({ where: { tripId: id, clientId } });
    const name = client ? (client as any).name : clientId;
    await participant.destroy();
    await logTripChange(id, req.user!.id, 'participant_removed', { oldValue: name });
    res.json({ message: 'Participant removed' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

function normalizeLayoutForSeatLookup(layout: any): { floors: Array<{ elements: any[] }> } | null {
  if (layout == null) return null;
  let parsed = layout;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const floors = Array.isArray((parsed as any).floors) ? (parsed as any).floors : null;
  if (!floors) return null;
  return {
    floors: floors.map((f: any) => ({
      elements: Array.isArray(f?.elements)
        ? f.elements
        : Array.isArray(f?.items)
          ? f.items
          : [],
    })),
  };
}

function seatIdExistsInLayout(layout: any, seatId: string): boolean {
  const normalized = normalizeLayoutForSeatLookup(layout);
  if (!normalized) return false;
  for (const floor of normalized.floors) {
    const elements = floor.elements || [];
    for (const el of elements) {
      if (el && el.type === 'seat' && el.id === seatId) return true;
    }
  }
  return false;
}

export const setSeatAssignment = [
  body('clientId').notEmpty().isUUID(),
  body('seatNumber').optional().isInt({ min: 1 }),
  body('seatId').optional().isString().trim().notEmpty(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!requireTripPermission(req, res, 'trips.participants_manage')) return;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const { id } = req.params;
      const { clientId, seatNumber, seatId } = req.body;
      const inTrip = await ensureUserCompanyInTrip(req, id);
      if (!inTrip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const trip = await Trip.findByPk(id, {
        include: [{ model: BusTemplate, as: 'busTemplate', attributes: ['id', 'layout', 'totalSeats'] }],
      });
      if (!trip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }
      const busTemplate = (trip as any).busTemplate;
      const layout = busTemplate?.layout;
      const useSeatId = layout && seatId != null && String(seatId).trim() !== '';
      if (useSeatId) {
        if (!seatIdExistsInLayout(layout, String(seatId).trim())) {
          res.status(400).json({ error: 'seatId not found in template layout' });
          return;
        }
      } else {
        if (seatNumber == null || seatNumber < 1 || seatNumber > (trip as any).totalSeats) {
          res.status(400).json({ error: 'Invalid seat number' });
          return;
        }
      }
      const isParticipant = await TripParticipant.findOne({ where: { tripId: id, clientId } });
      if (!isParticipant) {
        res.status(400).json({ error: 'Client is not a participant' });
        return;
      }
      const existingByClient = await TripSeatAssignment.findOne({ where: { tripId: id, clientId } });
      let existingBySeat: TripSeatAssignment | null = null;
      if (useSeatId) {
        existingBySeat = await TripSeatAssignment.findOne({ where: { tripId: id, seatId: String(seatId).trim() } });
      } else {
        existingBySeat = await TripSeatAssignment.findOne({ where: { tripId: id, seatNumber } });
      }
      let oldValue: string | null = null;
      if (existingByClient) {
        oldValue = existingByClient.seatId ?? (existingByClient.seatNumber != null ? String(existingByClient.seatNumber) : null);
        await existingByClient.destroy();
      }
      if (existingBySeat && existingBySeat.clientId !== clientId) {
        await existingBySeat.destroy();
      }
      const payload: { tripId: string; clientId: string; seatNumber?: number | null; seatId?: string | null } = {
        tripId: id,
        clientId,
      };
      if (useSeatId) {
        payload.seatId = String(seatId).trim();
        payload.seatNumber = null;
      } else {
        payload.seatNumber = Number(seatNumber);
        payload.seatId = null;
      }
      await TripSeatAssignment.create(payload as any);
      await logTripChange(id, req.user!.id, 'seat_assigned', {
        entityId: clientId,
        oldValue,
        newValue: useSeatId ? String(seatId) : String(seatNumber),
      });
      const updated = await Trip.findByPk(id, {
        include: [
          {
            model: TripSeatAssignment,
            as: 'seatAssignments',
            include: [{ model: Client, as: 'client', include: [{ model: Company, as: 'company', attributes: ['id', 'name'] }] }],
          },
        ],
      });
      res.json(updated);
    } catch (error) {
      console.error('Set seat assignment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const clearSeatAssignment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.office_admin')) return;
    const { id, clientId } = req.params;
    const seatId = (req.body?.seatId ?? req.query?.seatId) as string | undefined;
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    let assignment: TripSeatAssignment | null;
    if (seatId != null && String(seatId).trim() !== '') {
      assignment = await TripSeatAssignment.findOne({ where: { tripId: id, seatId: String(seatId).trim() } });
    } else if (clientId) {
      assignment = await TripSeatAssignment.findOne({ where: { tripId: id, clientId } });
    } else {
      res.status(400).json({ error: 'clientId or seatId required' });
      return;
    }
    if (assignment) {
      const oldVal = assignment.seatId ?? (assignment.seatNumber != null ? String(assignment.seatNumber) : null);
      await logTripChange(id, req.user!.id, 'seat_cleared', { oldValue: oldVal, entityId: assignment.clientId });
      await assignment.destroy();
    }
    res.json({ message: 'Seat cleared' });
  } catch (error) {
    console.error('Clear seat assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetSeatAssignments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.office_admin')) return;
    const { id } = req.params;
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const count = await TripSeatAssignment.count({ where: { tripId: id } });
    await TripSeatAssignment.destroy({ where: { tripId: id } });
    await logTripChange(id, req.user!.id, 'seat_assignments_reset', { oldValue: String(count) });
    res.json({ message: 'Seat assignments reset' });
  } catch (error) {
    console.error('Reset seat assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTripInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.office_admin')) return;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const invitations = await TripInvitation.findAll({
      where: { invitedCompanyId: companyId, status: 'pending' },
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Trip,
          as: 'trip',
          attributes: [
            'id',
            'title',
            'destination',
            'departureDate',
            'returnDate',
            'totalSeats',
            'isVisaTrip',
            'casDepartureDate',
            'casReturnDate',
            'consulateDepartureDate',
            'consulateReturnDate',
          ],
        },
        { model: User, as: 'invitedByUser', attributes: ['id', 'name', 'email'] },
      ],
    });
    const list = invitations.map(inv => {
      const j = inv.toJSON() as any;
      j.trip = j.trip;
      j.invitedBy = j.invitedByUser ? { id: j.invitedByUser.id, name: j.invitedByUser.name, email: j.invitedByUser.email } : null;
      delete j.invitedByUser;
      return j;
    });
    res.json(list);
  } catch (error) {
    console.error('Get trip invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acceptTripInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trip_invitations.update')) return;
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const inv = await TripInvitation.findByPk(id, {
      include: [{ model: Trip, as: 'trip' }],
    });
    if (!inv || inv.invitedCompanyId !== companyId || inv.status !== 'pending') {
      res.status(404).json({ error: 'Invitation not found or already responded' });
      return;
    }
    await TripCompany.findOrCreate({
      where: { tripId: inv.tripId, companyId },
      defaults: { tripId: inv.tripId, companyId },
    });
    await inv.update({
      status: 'accepted',
      respondedAt: new Date(),
      respondedBy: req.user!.id,
    });
    const company = await Company.findByPk(companyId, { attributes: ['name'] });
    await logTripChange(inv.tripId, req.user!.id, 'invitation_accepted', { newValue: company?.name || companyId });
    res.json({ message: 'Invitation accepted' });
  } catch (error) {
    console.error('Accept trip invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectTripInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trip_invitations.update')) return;
    const { id } = req.params;
    const companyId = req.user!.companyId;
    const inv = await TripInvitation.findByPk(id);
    if (!inv || inv.invitedCompanyId !== companyId || inv.status !== 'pending') {
      res.status(404).json({ error: 'Invitation not found or already responded' });
      return;
    }
    await inv.update({
      status: 'rejected',
      respondedAt: new Date(),
      respondedBy: req.user!.id,
    });
    await logTripChange(inv.tripId, req.user!.id, 'invitation_rejected');
    res.json({ message: 'Invitation rejected' });
  } catch (error) {
    console.error('Reject trip invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTripChangeLog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!requireTripPermission(req, res, 'trips.office_admin')) return;
    const { id } = req.params;
    const inTrip = await ensureUserCompanyInTrip(req, id);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }
    const entries = await TripChangeLog.findAll({
      where: { tripId: id },
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    });
    const list = entries.map(e => {
      const j = e.toJSON() as any;
      j.user = j.user ? { id: j.user.id, name: j.user.name } : null;
      return j;
    });
    res.json(list);
  } catch (error) {
    console.error('Get trip change log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
