/**
 * Teléfono: opcional `+` al inicio y 10 u 11 dígitos (p. ej. México 10, EE. UU. con prefijo 1).
 * Se guarda como `+15551234567` o `6182901223` según lo que ingrese el usuario.
 */

const MAX_PHONE_DIGITS = 11;

/** Cantidad de dígitos (ignora el +). */
export function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, '').length;
}

/**
 * Normaliza entrada: conserva `+` solo al inicio, solo dígitos después, máximo 11.
 * Permite estado intermedio `"+"` mientras el usuario escribe.
 */
export function normalizePhoneDigits(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const leadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
  if (!digits) return leadPlus ? '+' : '';
  return leadPlus ? `+${digits}` : digits;
}

function formatTenDigitPartial(d: string): string {
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)})-${d.slice(3)}`;
  return `(${d.slice(0, 3)})-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** 11 dígitos con prefijo país 1 (NANP). */
function formatElevenLeadingOnePartial(d: string): string {
  const n = d.slice(1);
  if (n.length === 0) return '+1';
  if (n.length <= 3) return `+1 (${n}`;
  if (n.length <= 6) return `+1 (${n.slice(0, 3)})-${n.slice(3)}`;
  return `+1 (${n.slice(0, 3)})-${n.slice(3, 6)}-${n.slice(6)}`;
}

/** Formato visual mientras se escribe o al mostrar. */
export function formatPhoneNumberDisplay(raw: string): string {
  const trimmed = raw.trim();
  const explicitPlus = trimmed.startsWith('+');
  const d = trimmed.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);

  if (!explicitPlus && d.length === 0) return '';
  if (explicitPlus && d.length === 0) return '+';

  if (d.length === 11 && d[0] === '1') {
    return formatElevenLeadingOnePartial(d);
  }

  if (!explicitPlus && d.length === 11 && d[0] === '1') {
    return formatElevenLeadingOnePartial(d);
  }

  if (explicitPlus) {
    const body = formatTenDigitPartial(d);
    return body ? `+ ${body}` : '+';
  }

  return formatTenDigitPartial(d);
}

export function isValidClientPhoneLength(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed === '+') return false;
  const n = countPhoneDigits(trimmed);
  return n === 10 || n === 11;
}

/**
 * Para listados y fichas: muestra número formateado o un texto cuando no hay número.
 */
export function formatPhoneOptional(
  phone: string | null | undefined,
  emptyLabel = 'No registrado'
): string {
  const raw = phone?.trim();
  if (!raw) return emptyLabel;
  const formatted = formatPhoneNumberDisplay(raw);
  return formatted || emptyLabel;
}

export const PHONE_MAX_DIGITS = MAX_PHONE_DIGITS;
