/** Colores distintos para identificar compañías en el detalle de viaje (fila + leyenda). */
export const TRIP_COMPANY_COLOR_STOPS: { main: string; soft: string }[] = [
  { main: '#0284c7', soft: 'rgba(2, 132, 199, 0.12)' },
  { main: '#7c3aed', soft: 'rgba(124, 58, 237, 0.12)' },
  { main: '#c2410c', soft: 'rgba(194, 65, 12, 0.12)' },
  { main: '#0d9488', soft: 'rgba(13, 148, 136, 0.12)' },
  { main: '#be185d', soft: 'rgba(190, 24, 93, 0.12)' },
  { main: '#4d7c0f', soft: 'rgba(77, 124, 15, 0.12)' },
  { main: '#b45309', soft: 'rgba(180, 83, 9, 0.12)' },
  { main: '#4338ca', soft: 'rgba(67, 56, 202, 0.12)' },
];

export function tripCompanyColorByIndex(index: number): { main: string; soft: string } {
  const i = ((index % TRIP_COMPANY_COLOR_STOPS.length) + TRIP_COMPANY_COLOR_STOPS.length) % TRIP_COMPANY_COLOR_STOPS.length;
  return TRIP_COMPANY_COLOR_STOPS[i]!;
}

/** Orden estable por id para que cada compañía conserve el mismo color. */
export function buildTripCompanyColorMap(
  companyIds: string[]
): Map<string, { main: string; soft: string }> {
  const sorted = [...new Set(companyIds)].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, { main: string; soft: string }>();
  sorted.forEach((id, idx) => map.set(id, tripCompanyColorByIndex(idx)));
  return map;
}
