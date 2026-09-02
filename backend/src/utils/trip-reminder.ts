export interface TripReminderConfig {
  daysBefore: number;
  frequencyDays: number;
  message: string;
}

export function parseTripReminderConfig(raw: unknown): TripReminderConfig | null {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const daysBefore = Number(o.daysBefore);
  const frequencyDays = Number(o.frequencyDays);
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  if (!message) return null;
  if (!Number.isInteger(daysBefore) || daysBefore < 1) return null;
  if (!Number.isInteger(frequencyDays) || frequencyDays < 1) return null;
  return { daysBefore, frequencyDays, message };
}

export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const datePart = String(value).slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(from: Date, to: Date): number {
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utcTo - utcFrom) / 86400000);
}

/** True when today falls on a scheduled reminder day before departure. */
export function shouldSendReminderToday(
  departureDate: Date | string,
  config: TripReminderConfig,
  today: Date = new Date()
): boolean {
  const departure = parseDateOnly(departureDate);
  const todayDate = parseDateOnly(today);
  const daysUntil = daysBetween(todayDate, departure);
  if (daysUntil < 0) return false;
  if (daysUntil > config.daysBefore) return false;
  const daysSinceStart = config.daysBefore - daysUntil;
  return daysSinceStart % config.frequencyDays === 0;
}

export function buildTripReminderMessage(
  template: string,
  ctx: {
    clientName: string;
    tripTitle: string;
    destination?: string | null;
    departureDate: string;
  }
): string {
  return template
    .replace(/\{nombre\}/gi, ctx.clientName)
    .replace(/\{viaje\}/gi, ctx.tripTitle)
    .replace(/\{destino\}/gi, ctx.destination?.trim() || '')
    .replace(/\{fecha_partida\}/gi, ctx.departureDate.slice(0, 10));
}

export function parseTripReminderConfigFromBody(body: unknown): TripReminderConfig | null | undefined {
  if (body === undefined) return undefined;
  if (body === null || body === '') return null;
  if (typeof body !== 'object') {
    throw new Error('Configuración de recordatorio inválida');
  }
  const o = body as Record<string, unknown>;
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  if (!message) return null;
  const daysBefore = Number(o.daysBefore);
  const frequencyDays = Number(o.frequencyDays);
  if (!Number.isInteger(daysBefore) || daysBefore < 1 || !Number.isInteger(frequencyDays) || frequencyDays < 1) {
    throw new Error('Configuración de recordatorio inválida');
  }
  return { daysBefore, frequencyDays, message };
}
