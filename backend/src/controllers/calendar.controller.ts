import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { Branch, Client, InternalAppointment, Trip, User } from '../models';

const formatDateOnly = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const makeEvent = (payload: {
  type: 'office' | 'trip_departure' | 'trip_return';
  date: string;
  title: string;
  /** HH:mm — citas internas; el resto usa orden por defecto */
  startTime?: string | null;
  clientId?: string;
  clientName?: string;
  tripId?: string;
  note?: string;
  status?: string;
  branchName?: string;
  advisorName?: string;
}) => payload;

function branchNameFromAssignedUser(assigned: { branch?: { name?: string } } | null | undefined): string | undefined {
  const n = assigned?.branch?.name;
  return typeof n === 'string' && n.trim() ? n.trim() : undefined;
}

function branchNameFromUsers(
  ...users: ({ branch?: { name?: string } } | null | undefined)[]
): string | undefined {
  for (const u of users) {
    const b = branchNameFromAssignedUser(u);
    if (b) return b;
  }
  return undefined;
}

function sortMinutesForEvent(e: { type: string; startTime?: string | null }): number {
  const t = e.startTime;
  if (t && /^\d{2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }
  switch (e.type) {
    case 'office':
      return 24 * 60 + 59;
    case 'trip_departure':
      return 6 * 60;
    case 'trip_return':
      return 22 * 60;
    default:
      return 12 * 60;
  }
}

export const getCalendarEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const from = String(req.query.from || '').slice(0, 10);
    const to = String(req.query.to || '').slice(0, 10);
    if (!from || !to) {
      res.status(400).json({ error: 'from and to are required (YYYY-MM-DD)' });
      return;
    }

    const officeAppointments = await InternalAppointment.findAll({
      where: {
        companyId,
        appointmentDate: { [Op.between]: [from, to] },
      },
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name'],
          include: [
            {
              model: User,
              as: 'assignedUser',
              attributes: ['id', 'name'],
              include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            },
          ],
        },
        {
          model: User,
          as: 'appointedByUser',
          attributes: ['id', 'name'],
          include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        },
      ],
      order: [['appointment_date', 'ASC']],
    });

    const trips = await Trip.findAll({
      where: {
        companyId,
        [Op.or]: [
          { departureDate: { [Op.between]: [from, to] } },
          { returnDate: { [Op.between]: [from, to] } },
        ],
      },
      attributes: ['id', 'title', 'departureDate', 'returnDate'],
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name'],
          include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
        },
      ],
      order: [['departure_date', 'ASC']],
    });

    const events: ReturnType<typeof makeEvent>[] = [];

    for (const appointment of officeAppointments as any[]) {
      const client = appointment.client;
      const assigned = client?.assignedUser;
      const appointedBy = appointment.appointedByUser;
      const branchName = branchNameFromUsers(assigned, appointedBy);
      const advisorName =
        typeof assigned?.name === 'string' && assigned.name.trim()
          ? assigned.name.trim()
          : typeof appointedBy?.name === 'string' && appointedBy.name.trim()
            ? appointedBy.name.trim()
            : undefined;
      const apptTime = appointment.appointmentTime ?? appointment.appointment_time ?? null;
      const timeStr =
        typeof apptTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(apptTime) ? apptTime : null;
      events.push(
        makeEvent({
          type: 'office',
          date: formatDateOnly(appointment.appointmentDate)!,
          title: client?.name || 'Cliente',
          startTime: timeStr,
          clientId: client?.id,
          clientName: client?.name,
          note: appointment.purposeNote,
          status: appointment.status,
          branchName,
          advisorName,
        })
      );
    }

    for (const trip of trips) {
      const tr = trip as any;
      const tripBranch = branchNameFromAssignedUser(tr.assignedUser);
      const departure = formatDateOnly(trip.departureDate);
      if (departure && departure >= from && departure <= to) {
        events.push(
          makeEvent({
            type: 'trip_departure',
            date: departure,
            title: `Salida viaje - ${trip.title}`,
            tripId: trip.id,
            branchName: tripBranch,
          })
        );
      }
      const returnDate = formatDateOnly(trip.returnDate);
      if (returnDate && returnDate >= from && returnDate <= to) {
        events.push(
          makeEvent({
            type: 'trip_return',
            date: returnDate,
            title: `Regreso viaje - ${trip.title}`,
            tripId: trip.id,
            branchName: tripBranch,
          })
        );
      }
    }

    events.sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return sortMinutesForEvent(a) - sortMinutesForEvent(b);
    });
    res.json(events);
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCalendarEventsByDate = async (req: AuthRequest, res: Response): Promise<void> => {
  req.query.from = req.query.date;
  req.query.to = req.query.date;
  await getCalendarEvents(req, res);
};
