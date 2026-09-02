import { Op } from 'sequelize';
import { Trip, TripParticipant, TripReminderSend, Client } from '../models';
import {
  buildTripReminderMessage,
  formatDateOnly,
  parseTripReminderConfig,
  shouldSendReminderToday,
} from '../utils/trip-reminder';
import { sendWhatsappOutboundToPhone } from './whatsappOutbound.service';

type ParticipantRow = TripParticipant & {
  client?: Client | null;
};

function resolveParticipantPhone(participant: ParticipantRow): string | null {
  if (participant.participantType === 'staff') return null;
  if (participant.participantType === 'client') {
    const phone = participant.client?.phone?.trim();
    return phone || null;
  }
  if (participant.participantType === 'companion') {
    const phone = participant.phone?.trim();
    return phone || null;
  }
  return null;
}

function resolveParticipantName(participant: ParticipantRow): string {
  if (participant.participantType === 'client' && participant.client?.name) {
    return participant.client.name;
  }
  if (participant.participantType === 'companion' && participant.name) {
    return participant.name;
  }
  return 'Participante';
}

export async function processDueTripReminders(today: Date = new Date()): Promise<{
  tripsChecked: number;
  remindersAttempted: number;
  textSent: number;
  templateSent: number;
  skipped: number;
  failed: number;
}> {
  const todayStr = formatDateOnly(today);
  const stats = {
    tripsChecked: 0,
    remindersAttempted: 0,
    textSent: 0,
    templateSent: 0,
    skipped: 0,
    failed: 0,
  };

  const trips = await Trip.findAll({
    where: {
      departureDate: { [Op.gte]: todayStr },
    },
    include: [
      {
        model: TripParticipant,
        as: 'participants',
        include: [{ model: Client, as: 'client', attributes: ['id', 'name', 'phone', 'companyId'] }],
      },
    ],
  });

  for (const trip of trips) {
    const config = parseTripReminderConfig((trip as any).reminderConfig);
    if (!config) continue;
    if (!shouldSendReminderToday(trip.departureDate, config, today)) continue;

    stats.tripsChecked += 1;
    const participants = ((trip as any).participants || []) as ParticipantRow[];
    const departureStr = String(trip.departureDate).slice(0, 10);

    for (const participant of participants) {
      if (participant.participantType === 'staff') continue;

      const existing = await TripReminderSend.findOne({
        where: {
          tripId: trip.id,
          participantId: participant.id,
          sendDate: todayStr,
        },
      });
      if (existing) continue;

      stats.remindersAttempted += 1;
      const phone = resolveParticipantPhone(participant);
      const clientId =
        participant.participantType === 'client' ? participant.clientId ?? participant.client?.id ?? null : null;

      if (!phone) {
        await TripReminderSend.create({
          tripId: trip.id,
          participantId: participant.id,
          clientId,
          sendDate: todayStr,
          whatsappStatus: 'skipped_no_phone',
        });
        stats.skipped += 1;
        continue;
      }

      const message = buildTripReminderMessage(config.message, {
        clientName: resolveParticipantName(participant),
        tripTitle: trip.title,
        destination: trip.destination,
        departureDate: departureStr,
      });

      const result = await sendWhatsappOutboundToPhone(trip.companyId, phone, message, {
        clientId: clientId ?? undefined,
        persistClientMessage: Boolean(clientId),
        strategy: 'direct',
      });

      await TripReminderSend.create({
        tripId: trip.id,
        participantId: participant.id,
        clientId,
        sendDate: todayStr,
        whatsappStatus: result.status === 'failed' ? 'failed' : result.status,
        errorMessage: result.errorMessage ?? null,
      });

      if (result.status === 'text_sent') stats.textSent += 1;
      else if (result.status === 'template_sent') stats.templateSent += 1;
      else stats.failed += 1;
    }
  }

  return stats;
}
