import type { TripParticipantClient } from '@/types/form';

export type TripParticipantRow = {
  id: string;
  clientId: string;
  client?: TripParticipantClient | null;
};

/**
 * Ordena participantes del viaje: primero el cliente titular de cada grupo (sin padre en el viaje
 * o padre ausente), luego todos sus hijos que también participan, y así con cada grupo.
 */
export function sortTripParticipantsByFamily(participants: TripParticipantRow[]): TripParticipantRow[] {
  const withClient = participants.filter((p): p is TripParticipantRow & { client: TripParticipantClient } =>
    Boolean(p.client)
  );
  const idSet = new Set(withClient.map((p) => p.client.id));

  const roots = withClient.filter((p) => {
    const pid = p.client.parentClientId ?? null;
    return !pid || !idSet.has(pid);
  });

  const firstIndex = (p: TripParticipantRow) => {
    const idx = participants.indexOf(p);
    return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
  };
  roots.sort((a, b) => firstIndex(a) - firstIndex(b));

  const out: TripParticipantRow[] = [];
  for (const root of roots) {
    out.push(root);
    const kids = withClient
      .filter((p) => p.client.parentClientId === root.client.id)
      .sort((a, b) =>
        (a.client.name || '').localeCompare(b.client.name || '', 'es', { sensitivity: 'base' })
      );
    out.push(...kids);
  }

  const withoutClient = participants.filter((p) => !p.client);
  return [...out, ...withoutClient];
}

export function isParticipantChildInTrip(
  client: TripParticipantClient | null | undefined,
  participantIds: Set<string>
): boolean {
  if (!client?.parentClientId) return false;
  return participantIds.has(client.parentClientId);
}
