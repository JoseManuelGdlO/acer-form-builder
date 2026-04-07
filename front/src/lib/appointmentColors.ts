import type { CalendarEvent } from '@/types/form';

/** Etiquetas para el calendario y tooltips */
export const APPOINTMENT_TYPE_LABELS: Record<CalendarEvent['type'], string> = {
  office: 'Oficina',
  cas: 'CAS',
  consular: 'Consulado',
  trip_departure: 'Viaje · Salida',
  trip_return: 'Viaje · Regreso',
};

/**
 * Colores acordados para identificar citas:
 * Oficina → verde, Consulado → rojo, CAS → azul, Viajes → morado
 */
export function appointmentTypeBadgeClass(type: CalendarEvent['type']): string {
  switch (type) {
    case 'office':
      return 'border-0 bg-green-600 text-white shadow-none hover:bg-green-600';
    case 'cas':
      return 'border-0 bg-blue-600 text-white shadow-none hover:bg-blue-600';
    case 'consular':
      return 'border-0 bg-red-600 text-white shadow-none hover:bg-red-600';
    case 'trip_departure':
    case 'trip_return':
      return 'border-0 bg-violet-600 text-white shadow-none hover:bg-violet-600';
    default:
      return 'border-0 bg-secondary text-secondary-foreground';
  }
}

export function appointmentEventRowBorderClass(type: CalendarEvent['type']): string {
  switch (type) {
    case 'office':
      return 'border-l-4 border-l-green-600';
    case 'cas':
      return 'border-l-4 border-l-blue-600';
    case 'consular':
      return 'border-l-4 border-l-red-600';
    case 'trip_departure':
    case 'trip_return':
      return 'border-l-4 border-l-violet-600';
    default:
      return '';
  }
}

/** Mismos colores en badges reutilizables (perfil, lista de clientes, etc.) */
export const APPOINTMENT_BADGE_CLASSES = {
  office: 'border-0 bg-green-600 text-white shadow-none hover:bg-green-600',
  cas: 'border-0 bg-blue-600 text-white shadow-none hover:bg-blue-600',
  consular: 'border-0 bg-red-600 text-white shadow-none hover:bg-red-600',
  trip: 'border-0 bg-violet-600 text-white shadow-none hover:bg-violet-600',
} as const;
