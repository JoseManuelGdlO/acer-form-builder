export function getTenantLookupDomain(
  hostname: string = typeof window !== 'undefined' ? window.location.hostname : '',
): string {
  return hostname === 'localhost' || hostname === '127.0.0.1' ? 'travelup' : hostname;
}
