import type { QuoteServiceType, QuoteStatus } from '../models/Quote';

export const QUOTE_SERVICE_TYPES: QuoteServiceType[] = ['lodging', 'package', 'flight', 'circuit'];
export const QUOTE_STATUSES: QuoteStatus[] = ['draft', 'registered', 'expired'];

export const DEFAULT_QUOTE_INCLUDES = [
  'Hospedaje en la categoría indicada',
  'Impuestos hoteleros, si aplica',
  'Plan de alimentos indicado',
  'Asesoría personalizada',
].join('\n');

export const DEFAULT_QUOTE_EXCLUDES = [
  'Propinas',
  'Resort fee, salvo indicación',
  'Gastos personales',
  'Vuelos no especificados',
].join('\n');

export const DEFAULT_QUOTE_TERMS = [
  'Anticipo no reembolsable para confirmar.',
  'Saldo liquidable 30 días antes de la salida.',
  'Tarifas sujetas a disponibilidad al momento de la reserva.',
].join('\n');

export const DEFAULT_QUOTE_DOC_TITLE = 'Cotización de servicios de viaje';
export const DEFAULT_QUOTE_FOOTER =
  'Precios sujetos a cambio sin previo aviso · Documento informativo, no constituye reservación.';

export const DEFAULT_QUOTE_HEADER_COLOR = '#1379BE';
export const DEFAULT_QUOTE_ACCENT_COLOR = '#D51E26';
