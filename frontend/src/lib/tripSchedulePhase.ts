import { format } from 'date-fns';
import type { StatusBadgeTone } from '@/components/layout/StatusBadge';
import type { Trip } from '@/types/form';

/** Fase visual a partir de fechas reales. GET /trips no trae status. */
export function tripSchedulePhase(
  departureDate: string,
  returnDate: string,
  today = format(new Date(), 'yyyy-MM-dd'),
): { label: string; tone: StatusBadgeTone } {
  const dep = departureDate.slice(0, 10);
  const ret = returnDate.slice(0, 10);
  if (today < dep) return { label: 'Próximo', tone: 'accent' };
  if (today > ret) return { label: 'Concluido', tone: 'neutral' };
  return { label: 'En curso', tone: 'success' };
}

export function tripOccupancy(trip: Trip): { count: number; total: number; percent: number } {
  const count = trip.participantCount ?? trip.participants?.length ?? 0;
  const total = trip.totalSeats ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  return { count, total, percent };
}

/** Ingresos solo si el listado los incluye en el payload. */
export function tripListIncome(trip: Trip): number | null {
  const extra = trip as Trip & { totalIncome?: unknown; income?: unknown };
  if (typeof extra.totalIncome === 'number' && Number.isFinite(extra.totalIncome)) {
    return extra.totalIncome;
  }
  if (typeof extra.income === 'number' && Number.isFinite(extra.income)) {
    return extra.income;
  }
  return null;
}
