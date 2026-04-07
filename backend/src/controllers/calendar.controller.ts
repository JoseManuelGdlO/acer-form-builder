import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { Client, InternalAppointment, Trip } from '../models';

const formatDateOnly = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

const makeEvent = (payload: {
  type: 'office' | 'cas' | 'consular' | 'trip_departure' | 'trip_return';
  date: string;
  title: string;
  clientId?: string;
  clientName?: string;
  tripId?: string;
  note?: string;
  status?: string;
}) => payload;

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

    const clients = await Client.findAll({
      where: { companyId },
      attributes: [
        'id',
        'name',
        'visaCasAppointmentDate',
        'visaCasAppointmentLocation',
        'visaConsularAppointmentDate',
        'visaConsularAppointmentLocation',
      ],
    });

    const officeAppointments = await InternalAppointment.findAll({
      where: {
        companyId,
        appointmentDate: { [Op.between]: [from, to] },
      },
      include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
      order: [['appointment_date', 'ASC']],
    });

    const trips = await Trip.findAll({
      where: {
        companyId,
        [Op.or]: [{ departureDate: { [Op.between]: [from, to] } }, { returnDate: { [Op.between]: [from, to] } }],
      },
      attributes: ['id', 'title', 'departureDate', 'returnDate'],
      order: [['departure_date', 'ASC']],
    });

    const events: any[] = [];
    for (const client of clients) {
      const casDate = formatDateOnly(client.visaCasAppointmentDate);
      if (casDate && casDate >= from && casDate <= to) {
        events.push(
          makeEvent({
            type: 'cas',
            date: casDate,
            title: `CAS - ${client.name}`,
            clientId: client.id,
            clientName: client.name,
            note: client.visaCasAppointmentLocation || undefined,
          })
        );
      }
      const consularDate = formatDateOnly(client.visaConsularAppointmentDate);
      if (consularDate && consularDate >= from && consularDate <= to) {
        events.push(
          makeEvent({
            type: 'consular',
            date: consularDate,
            title: `Consulado - ${client.name}`,
            clientId: client.id,
            clientName: client.name,
            note: client.visaConsularAppointmentLocation || undefined,
          })
        );
      }
    }

    for (const appointment of officeAppointments as any[]) {
      const client = appointment.client;
      events.push(
        makeEvent({
          type: 'office',
          date: formatDateOnly(appointment.appointmentDate)!,
          title: `Oficina - ${client?.name || 'Cliente'}`,
          clientId: client?.id,
          clientName: client?.name,
          note: appointment.purposeNote,
          status: appointment.status,
        })
      );
    }

    for (const trip of trips) {
      const departure = formatDateOnly(trip.departureDate);
      if (departure && departure >= from && departure <= to) {
        events.push(
          makeEvent({
            type: 'trip_departure',
            date: departure,
            title: `Salida viaje - ${trip.title}`,
            tripId: trip.id,
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
          })
        );
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
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
