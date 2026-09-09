import type { Group, Trip } from '@/types/form';
import { tripSchedulePhase } from '@/lib/tripSchedulePhase';

/**
 * Grupo en operación (aproximado): tiene al menos un viaje asignado
 * que, en la lista cargada, está Próximo o En curso.
 */
export function countGroupsInOperation(
  groups: Group[],
  trips: Trip[],
): { inOperation: number; catalogTotal: number } {
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  let inOperation = 0;
  for (const group of groups) {
    const assigned = group.assignedTrips ?? [];
    const hasCurrentTrip = assigned.some((link) => {
      const trip = tripById.get(link.id);
      if (!trip?.departureDate || !trip.returnDate) return false;
      const phase = tripSchedulePhase(trip.departureDate, trip.returnDate);
      return phase.label === 'Próximo' || phase.label === 'En curso';
    });
    if (hasCurrentTrip) inOperation += 1;
  }
  return { inOperation, catalogTotal: groups.length };
}
