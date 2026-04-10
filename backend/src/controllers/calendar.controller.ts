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
  type:
    | 'office'
    | 'cas'
    | 'consular'
    | 'trip_departure'
    | 'trip_return'
    | 'trip_visa_cas_dep'
    | 'trip_visa_cas_ret'
    | 'trip_visa_con_dep'
    | 'trip_visa_con_ret';
  date: string;
  title: string;
  /** HH:mm — citas internas; el resto usa orden por defecto */
  startTime?: string | null;
  clientId?: string;
  clientName?: string;
  tripId?: string;
  note?: string;
  status?: string;
}) => payload;

/** Minutos desde medianoche para ordenar eventos del mismo día */
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
    case 'trip_visa_cas_dep':
      return 6 * 60;
    case 'trip_visa_cas_ret':
      return 6 * 60 + 15;
    case 'trip_visa_con_dep':
      return 6 * 60 + 30;
    case 'trip_visa_con_ret':
      return 6 * 60 + 45;
    case 'cas':
      return 10 * 60;
    case 'consular':
      return 11 * 60;
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
        [Op.or]: [
          { departureDate: { [Op.between]: [from, to] } },
          { returnDate: { [Op.between]: [from, to] } },
          { casDepartureDate: { [Op.between]: [from, to] } },
          { casReturnDate: { [Op.between]: [from, to] } },
          { consulateDepartureDate: { [Op.between]: [from, to] } },
          { consulateReturnDate: { [Op.between]: [from, to] } },
        ],
      },
      attributes: [
        'id',
        'title',
        'departureDate',
        'returnDate',
        'isVisaTrip',
        'casDepartureDate',
        'casReturnDate',
        'consulateDepartureDate',
        'consulateReturnDate',
      ],
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
      const apptTime = appointment.appointmentTime ?? appointment.appointment_time ?? null;
      const timeStr =
        typeof apptTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(apptTime) ? apptTime : null;
      events.push(
        makeEvent({
          type: 'office',
          date: formatDateOnly(appointment.appointmentDate)!,
          title: `Oficina - ${client?.name || 'Cliente'}`,
          startTime: timeStr,
          clientId: client?.id,
          clientName: client?.name,
          note: appointment.purposeNote,
          status: appointment.status,
        })
      );
    }

    for (const trip of trips) {
      const tr = trip as any;
      if (tr.isVisaTrip) {
        const casD = formatDateOnly(tr.casDepartureDate);
        if (casD && casD >= from && casD <= to) {
          events.push(
            makeEvent({
              type: 'trip_visa_cas_dep',
              date: casD,
              title: `Viaje (CAS salida) - ${trip.title}`,
              tripId: trip.id,
            })
          );
        }
        const casR = formatDateOnly(tr.casReturnDate);
        if (casR && casR >= from && casR <= to) {
          events.push(
            makeEvent({
              type: 'trip_visa_cas_ret',
              date: casR,
              title: `Viaje (CAS regreso) - ${trip.title}`,
              tripId: trip.id,
            })
          );
        }
        const conD = formatDateOnly(tr.consulateDepartureDate);
        if (conD && conD >= from && conD <= to) {
          events.push(
            makeEvent({
              type: 'trip_visa_con_dep',
              date: conD,
              title: `Viaje (consulado salida) - ${trip.title}`,
              tripId: trip.id,
            })
          );
        }
        const conR = formatDateOnly(tr.consulateReturnDate);
        if (conR && conR >= from && conR <= to) {
          events.push(
            makeEvent({
              type: 'trip_visa_con_ret',
              date: conR,
              title: `Viaje (consulado regreso) - ${trip.title}`,
              tripId: trip.id,
            })
          );
        }
      } else {
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
