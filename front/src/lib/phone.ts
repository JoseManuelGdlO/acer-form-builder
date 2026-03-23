/**
 * Teléfono en la app: estado y API/BD = solo dígitos (máx. 10).
 * UI puede mostrar formato (XXX)-XXX-XXXX.
 */

const MAX_PHONE_DIGITS = 10;

/** Quita todo lo que no sea dígito y limita a 10 caracteres. */
export function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_PHONE_DIGITS);
}

/** Formato visual tipo (618)-290-1223 a partir de dígitos crudos. */
export function formatPhoneNumberDisplay(digits: string): string {
  const limited = normalizePhoneDigits(digits);
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)})-${limited.slice(3)}`;
  return `(${limited.slice(0, 3)})-${limited.slice(3, 6)}-${limited.slice(6)}`;
}

/**
 * Para listados y fichas: muestra (XXX)-XXX-XXXX o un texto cuando no hay número.
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
