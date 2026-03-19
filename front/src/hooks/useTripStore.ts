import { useState, useCallback } from 'react';
import { Trip, TripInvitation, TripChangeLogEntry, TripParticipantClient, TripSeatAssignmentEntry, BusTemplate } from '@/types/form';
import { api } from '@/lib/api';

function parseJsonIfString<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as T;
  return null;
}

function mapParticipant(p: any) {
  const client = p.client || {};
  const company = client.company || {};
  const tripClient: TripParticipantClient = {
    id: client.id,
    name: client.name,
    email: client.email ?? '',
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    status: client.status,
    formsCompleted: client.forms_completed ?? client.formsCompleted ?? 0,
    assignedUserId: client.assigned_user_id ?? client.assignedUserId,
    totalAmountDue: client.total_amount_due ?? client.totalAmountDue,
    createdAt: new Date(client.created_at ?? client.createdAt ?? 0),
    updatedAt: new Date(client.updated_at ?? client.updatedAt ?? 0),
  };
  if (company.id) tripClient.company = { id: company.id, name: company.name };
  return {
    id: p.id,
    clientId: p.client_id ?? p.clientId,
    client: tripClient,
  };
}

function mapSeatAssignment(s: any): TripSeatAssignmentEntry {
  const client = s.client || {};
  const entry: TripSeatAssignmentEntry = {
    clientId: s.client_id ?? s.clientId,
    seatNumber: s.seat_number ?? s.seatNumber ?? null,
    seatId: s.seat_id ?? s.seatId ?? null,
  };
  if (s.id) (entry as any).id = s.id;
  if (client.id) {
    (entry as any).client = {
      ...client,
      company: client.company ? { id: client.company.id, name: client.company.name } : undefined,
    };
  }
  return entry;
}

function mapBusTemplate(raw: any): BusTemplate | null {
  if (!raw?.id) return null;
  const parsedLayout = parseJsonIfString<BusTemplate['layout']>(raw.layout);
  const parsedSeatLabels = parseJsonIfString<string[] | null>(raw.seat_labels ?? raw.seatLabels);
  return {
    id: raw.id,
    companyId: raw.company_id ?? raw.companyId,
    name: raw.name,
    totalSeats: raw.total_seats ?? raw.totalSeats,
    rows: raw.rows,
    bathroomPosition: raw.bathroom_position ?? raw.bathroomPosition,
    floors: raw.floors,
    stairsPosition: raw.stairs_position ?? raw.stairsPosition ?? null,
    seatLabels: parsedSeatLabels ?? null,
    layout: parsedLayout ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

function mapTrip(raw: any): Trip {
  const participants = (raw.participants || []).map(mapParticipant);
  const seatAssignments = (raw.seat_assignments ?? raw.seatAssignments ?? []).map(mapSeatAssignment);
  const busTemplate = raw.bus_template ?? raw.busTemplate;
  return {
    id: raw.id,
    title: raw.title,
    destination: raw.destination ?? null,
    departureDate: raw.departure_date ?? raw.departureDate,
    returnDate: raw.return_date ?? raw.returnDate,
    notes: raw.notes ?? null,
    totalSeats: raw.total_seats ?? raw.totalSeats,
    companyId: raw.company_id ?? raw.companyId,
    busTemplateId: raw.bus_template_id ?? raw.busTemplateId ?? null,
    busTemplate: busTemplate ? mapBusTemplate(busTemplate) : null,
    assignedUserId: raw.assigned_user_id ?? raw.assignedUserId,
    sharedCompanies: raw.shared_companies ?? raw.sharedCompanies ?? [],
    participants,
    seatAssignments,
    participantCount: raw.participant_count ?? raw.participantCount ?? participants.length,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

function mapInvitation(raw: any): TripInvitation {
  const trip = raw.trip || {};
  const invitedBy = raw.invited_by ?? raw.invitedByUser ?? raw.invitedBy;
  return {
    id: raw.id,
    tripId: raw.trip_id ?? raw.tripId,
    trip: trip.id
      ? {
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          departureDate: trip.departure_date ?? trip.departureDate,
          returnDate: trip.return_date ?? trip.returnDate,
          totalSeats: trip.total_seats ?? trip.totalSeats,
        }
      : undefined,
    invitedCompanyId: raw.invited_company_id ?? raw.invitedCompanyId,
    invitedBy: invitedBy ? { id: invitedBy.id, name: invitedBy.name, email: invitedBy.email } : undefined,
    status: raw.status ?? 'pending',
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  };
}

function mapChangeLogEntry(raw: any): TripChangeLogEntry {
  const user = raw.user || {};
  return {
    id: raw.id,
    tripId: raw.trip_id ?? raw.tripId,
    userId: raw.user_id ?? raw.userId,
    user: user.id ? { id: user.id, name: user.name } : undefined,
    action: raw.action,
    entityType: raw.entity_type ?? raw.entityType,
    entityId: raw.entity_id ?? raw.entityId,
    fieldName: raw.field_name ?? raw.fieldName,
    oldValue: raw.old_value ?? raw.oldValue,
    newValue: raw.new_value ?? raw.newValue,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  };
}

export const useTripStore = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [changeLog, setChangeLog] = useState<TripChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTrips = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getTrips(token);
      const list = Array.isArray(response) ? response : [];
      setTrips(list.map(mapTrip));
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTrip = useCallback(async (id: string, token: string) => {
    try {
      const raw = await api.getTrip(id, token);
      const trip = mapTrip(raw);
      setCurrentTrip(trip);
      setTrips(prev => prev.map(t => (t.id === id ? trip : t)));
      return trip;
    } catch (error) {
      console.error('Failed to fetch trip:', error);
      throw error;
    }
  }, []);

  const fetchInvitations = useCallback(async (token: string) => {
    try {
      const response = await api.getTripInvitations(token);
      const list = Array.isArray(response) ? response : [];
      setInvitations(list.map(mapInvitation));
    } catch (error) {
      console.error('Failed to fetch trip invitations:', error);
      throw error;
    }
  }, []);

  const fetchChangeLog = useCallback(async (tripId: string, token: string) => {
    try {
      const response = await api.getTripChangeLog(tripId, token);
      const list = Array.isArray(response) ? response : [];
      setChangeLog(list.map(mapChangeLogEntry));
    } catch (error) {
      console.error('Failed to fetch trip change log:', error);
      throw error;
    }
  }, []);

  const acceptInvitation = useCallback(async (invitationId: string, token: string) => {
    await api.acceptTripInvitation(invitationId, token);
    setInvitations(prev => prev.filter(i => i.id !== invitationId));
  }, []);

  const rejectInvitation = useCallback(async (invitationId: string, token: string) => {
    await api.rejectTripInvitation(invitationId, token);
    setInvitations(prev => prev.filter(i => i.id !== invitationId));
  }, []);

  const createTrip = useCallback(
    async (
      token: string,
      data: {
        title: string;
        departureDate: string;
        returnDate: string;
        totalSeats: number;
        destination?: string;
        notes?: string;
        busTemplateId?: string | null;
        invitedCompanyIds?: string[];
      }
    ) => {
      const created = await api.createTrip(data, token);
      const trip = mapTrip(created);
      setTrips(prev => [trip, ...prev]);
      return trip;
    },
    []
  );

  const updateTrip = useCallback(
    async (
      token: string,
      tripId: string,
      data: {
        title?: string;
        departureDate?: string;
        returnDate?: string;
        totalSeats?: number;
        destination?: string;
        notes?: string;
        busTemplateId?: string | null;
        invitedCompanyIds?: string[];
      }
    ) => {
      const updated = await api.updateTrip(tripId, data, token);
      const trip = mapTrip(updated);
      setTrips(prev => prev.map(t => (t.id === tripId ? trip : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(trip);
      return trip;
    },
    [currentTrip?.id]
  );

  const deleteTrip = useCallback(async (token: string, tripId: string) => {
    await api.deleteTrip(tripId, token);
    setTrips(prev => prev.filter(t => t.id !== tripId));
    if (currentTrip?.id === tripId) setCurrentTrip(null);
  }, [currentTrip?.id]);

  const addParticipants = useCallback(async (token: string, tripId: string, data: { clientIds?: string[]; groupIds?: string[] }) => {
    const updated = await api.addTripParticipants(tripId, data, token);
    const trip = mapTrip(updated);
    setTrips(prev => prev.map(t => (t.id === tripId ? trip : t)));
    if (currentTrip?.id === tripId) setCurrentTrip(trip);
    return trip;
  }, [currentTrip?.id]);

  const removeParticipant = useCallback(async (token: string, tripId: string, clientId: string) => {
    await api.removeTripParticipant(tripId, clientId, token);
    const trip = await api.getTrip(tripId, token);
    const mapped = mapTrip(trip);
    setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
    if (currentTrip?.id === tripId) setCurrentTrip(mapped);
  }, [currentTrip?.id]);

  const setSeatAssignment = useCallback(
    async (
      token: string,
      tripId: string,
      clientId: string,
      seat: { seatNumber?: number; seatId?: string }
    ) => {
      await api.setTripSeatAssignment(
        tripId,
        { clientId, ...(seat.seatId != null ? { seatId: seat.seatId } : { seatNumber: seat.seatNumber! }) },
        token
      );
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const resetSeatAssignments = useCallback(async (token: string, tripId: string) => {
    await api.resetTripSeatAssignments(tripId, token);
    const trip = await api.getTrip(tripId, token);
    const mapped = mapTrip(trip);
    setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
    if (currentTrip?.id === tripId) setCurrentTrip(mapped);
  }, [currentTrip?.id]);

  const clearSeatAssignment = useCallback(
    async (token: string, tripId: string, opts: { clientId?: string; seatId?: string }) => {
      await api.clearTripSeatAssignment(tripId, opts, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const clearCurrentTrip = useCallback(() => setCurrentTrip(null), []);

  return {
    trips,
    currentTrip,
    invitations,
    changeLog,
    isLoading,
    fetchTrips,
    fetchTrip,
    fetchInvitations,
    fetchChangeLog,
    acceptInvitation,
    rejectInvitation,
    createTrip,
    updateTrip,
    deleteTrip,
    addParticipants,
    removeParticipant,
    setSeatAssignment,
    resetSeatAssignments,
    clearSeatAssignment,
    clearCurrentTrip,
  };
};
