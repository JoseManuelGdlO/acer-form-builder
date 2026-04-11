import type { FormSection } from '@/types/form';

/**
 * El backend puede devolver `sections` como JSON string, array o (legado) objeto mapa.
 * Sin esto, `for (const s of form.sections)` sobre un string itera caracteres y no hay preguntas/secciones.
 */
export function parseFormSectionsFromApi(raw: unknown): FormSection[] {
  let candidate: unknown = raw;

  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate) && candidate && typeof candidate === 'object') {
    candidate = Object.values(candidate as Record<string, unknown>);
  }

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate as FormSection[];
}
