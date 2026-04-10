import type { CalendarEvent } from '@/types/form';

function sortMinutes(e: CalendarEvent): number {
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

/** Misma lógica que el backend: por fecha y luego por hora lógica */
export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return sortMinutes(a) - sortMinutes(b);
  });
}
