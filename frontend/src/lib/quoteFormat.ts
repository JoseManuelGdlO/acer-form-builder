import type { QuoteOrigin, QuoteServiceType, QuoteStatus } from '@/types/quote';
import type { StatusBadgeTone } from '@/components/layout/StatusBadge';

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  registered: 'Registrada',
  expired: 'Vencida',
};

export const QUOTE_TYPE_LABEL: Record<QuoteServiceType, string> = {
  lodging: 'Hospedaje',
  package: 'Paquete',
  flight: 'Vuelo',
  circuit: 'Circuito',
};

export const QUOTE_ORIGIN_LABEL: Record<QuoteOrigin, string> = {
  system: 'Creada en sistema',
  uploaded: 'Documento cargado',
};

export const QUOTE_SERVICE_TYPES: QuoteServiceType[] = ['lodging', 'package', 'flight', 'circuit'];

export function quoteTone(status: QuoteStatus): StatusBadgeTone {
  if (status === 'registered') return 'success';
  if (status === 'expired') return 'warning';
  return 'neutral';
}

export function formatQuoteMoney(amount: number | null | undefined, currency = 'MXN'): string {
  if (amount == null || Number.isNaN(Number(amount))) return 'Por capturar';
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
  return `${formatted} ${currency}`;
}

export function formatQuoteDate(value: string | null | undefined): string {
  if (!value) return 'Por definir';
  const key = value.slice(0, 10);
  const [y, m, d] = key.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function linesToText(lines: string[] | undefined): string {
  return (lines ?? []).join('\n');
}

export function textToLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
