import { useState, useCallback } from 'react';
import {
  Trip,
  TripInvitation,
  TripChangeLogEntry,
  TripParticipantClient,
  TripSeatAssignmentEntry,
  BusTemplate,
  TripIncome,
  TripExpense,
  TripFinanceSummary,
} from '@/types/form';
import type {
  Hotel as HotelCatalog,
  TripHotelBooking,
  TripHotelRoomAssignmentParticipant,
  TripHotelRoomRow,
  TripHotelRoomType,
} from '@/types/hotel';
import { api } from '@/lib/api';

const isProbablyJwt = (value: string): boolean => {
  const parts = value.split('.');
  return parts.length === 3 && parts.every((p) => p.length > 0);
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

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
  const participantType = (p.participant_type ?? p.participantType ?? 'client') as 'client' | 'companion' | 'staff';
  const client = p.client || {};
  const companionName = p.name ?? p.companion_name ?? null;
  const companionPhone = p.phone ?? p.companion_phone ?? null;
  const staffMemberRaw = p.staff_member ?? p.staffMember ?? null;
  const company = client.company || {};
  const au = client.assigned_user ?? client.assignedUser;
  const br = au?.branch;
  const tripClient: TripParticipantClient = {
    id: client.id,
    name: client.name,
    email: client.email ?? '',
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    status: (client.status as TripParticipantClient['status']) ?? 'pending',
    formsCompleted: client.forms_completed ?? client.formsCompleted ?? 0,
    assignedUserId: client.assigned_user_id ?? client.assignedUserId,
    parentClientId: client.parent_client_id ?? client.parentClientId ?? null,
    totalAmountDue: client.total_amount_due ?? client.totalAmountDue,
    tripBalanceDue:
      client.trip_balance_due !== undefined
        ? client.trip_balance_due
        : client.tripBalanceDue !== undefined
          ? client.tripBalanceDue
          : undefined,
    createdAt: new Date(client.created_at ?? client.createdAt ?? 0),
    updatedAt: new Date(client.updated_at ?? client.updatedAt ?? 0),
  };
  if (company.id) tripClient.company = { id: company.id, name: company.name };
  if (au?.id) {
    tripClient.assignedUser = {
      id: au.id,
      name: au.name,
      email: au.email,
      ...(br?.id ? { branch: { id: br.id, name: br.name } } : {}),
    };
  }
  return {
    id: p.id,
    participantType,
    clientId: p.client_id ?? p.clientId ?? null,
    staffMemberId: p.staff_member_id ?? p.staffMemberId ?? null,
    staffMember: staffMemberRaw
      ? {
          id: staffMemberRaw.id,
          companyId: staffMemberRaw.company_id ?? staffMemberRaw.companyId,
          name: staffMemberRaw.name,
          phone: staffMemberRaw.phone ?? null,
          role: staffMemberRaw.role ?? null,
          notes: staffMemberRaw.notes ?? null,
          createdAt: staffMemberRaw.created_at ?? staffMemberRaw.createdAt,
          updatedAt: staffMemberRaw.updated_at ?? staffMemberRaw.updatedAt,
        }
      : null,
    companion:
      participantType === 'companion'
        ? {
            name: companionName ?? '',
            phone: companionPhone,
          }
        : undefined,
    client: participantType === 'client' ? tripClient : null,
    pickupLocation:
      p.pickup_location !== undefined
        ? p.pickup_location
        : p.pickupLocation !== undefined
          ? p.pickupLocation
          : null,
  };
}

function mapSeatAssignment(s: any): TripSeatAssignmentEntry {
  const client = s.client || {};
  const entry: TripSeatAssignmentEntry = {
    participantId: s.participant_id ?? s.participantId ?? undefined,
    clientId: s.client_id ?? s.clientId,
    seatNumber: s.seat_number ?? s.seatNumber ?? null,
    seatId: s.seat_id ?? s.seatId ?? null,
  };
  if (s.id) (entry as any).id = s.id;
  const participant = s.participant || {};
  if (participant.id) {
    entry.participant = {
      id: participant.id,
      participantType: participant.participant_type ?? participant.participantType ?? 'client',
      name: participant.name ?? null,
      phone: participant.phone ?? null,
      role: participant.role ?? null,
      clientId: participant.client_id ?? participant.clientId ?? null,
      staffMemberId: participant.staff_member_id ?? participant.staffMemberId ?? null,
      pickupLocation:
        participant.pickup_location !== undefined
          ? participant.pickup_location
          : participant.pickupLocation !== undefined
            ? participant.pickupLocation
            : null,
    };
  }
  if (client.id) {
    (entry as any).client = {
      ...client,
      company: client.company ? { id: client.company.id, name: client.company.name } : undefined,
    };
  }
  return entry;
}

function mapHotelCatalog(h: any): HotelCatalog {
  return {
    id: h.id,
    companyId: h.company_id ?? h.companyId,
    name: h.name,
    address: h.address ?? null,
    city: h.city ?? null,
    country: h.country ?? null,
    phone: h.phone ?? null,
    email: h.email ?? null,
    notes: h.notes ?? null,
    totalSingleRooms: Number(h.total_single_rooms ?? h.totalSingleRooms ?? 0),
    totalDoubleRooms: Number(h.total_double_rooms ?? h.totalDoubleRooms ?? 0),
    totalTripleRooms: Number(h.total_triple_rooms ?? h.totalTripleRooms ?? 0),
    createdAt: h.created_at ?? h.createdAt,
    updatedAt: h.updated_at ?? h.updatedAt,
  };
}

function mapTripHotelRoom(r: any): TripHotelRoomRow {
  const assignments = (r.assignments || []).map((a: any) => ({
    id: a.id,
    tripHotelRoomId: a.trip_hotel_room_id ?? a.tripHotelRoomId,
    participantId: a.participant_id ?? a.participantId,
    participant: a.participant?.id
      ? (mapParticipant(a.participant) as unknown as TripHotelRoomAssignmentParticipant)
      : undefined,
  }));
  return {
    id: r.id,
    tripHotelId: r.trip_hotel_id ?? r.tripHotelId,
    roomType: (r.room_type ?? r.roomType) as TripHotelRoomType,
    label: r.label,
    sortOrder: r.sort_order ?? r.sortOrder ?? 0,
    assignments,
  };
}

function mapTripHotel(th: any): TripHotelBooking {
  return {
    id: th.id,
    tripId: th.trip_id ?? th.tripId,
    hotelId: th.hotel_id ?? th.hotelId,
    hotel: th.hotel ? mapHotelCatalog(th.hotel) : undefined,
    checkInDate: String(th.check_in_date ?? th.checkInDate ?? '').slice(0, 10),
    checkOutDate: String(th.check_out_date ?? th.checkOutDate ?? '').slice(0, 10),
    reservedSingles: Number(th.reserved_singles ?? th.reservedSingles ?? 0),
    reservedDoubles: Number(th.reserved_doubles ?? th.reservedDoubles ?? 0),
    reservedTriples: Number(th.reserved_triples ?? th.reservedTriples ?? 0),
    notes: th.notes ?? null,
    rooms: (th.rooms || []).map(mapTripHotelRoom),
    createdAt: th.created_at ?? th.createdAt,
    updatedAt: th.updated_at ?? th.updatedAt,
  };
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
  const tripHotelsRaw = raw.hotels ?? raw.trip_hotels ?? raw.tripHotels ?? [];
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
    tripHotels: Array.isArray(tripHotelsRaw) ? tripHotelsRaw.map(mapTripHotel) : [],
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

function mapTripIncome(raw: any): TripIncome {
  return {
    id: raw.id,
    clientId: raw.client_id ?? raw.clientId,
    tripId: raw.trip_id ?? raw.tripId ?? null,
    client: raw.client ? { id: raw.client.id, name: raw.client.name } : undefined,
    amount: Number(raw.amount ?? 0),
    paymentDate: raw.payment_date ?? raw.paymentDate,
    paymentType: raw.payment_type ?? raw.paymentType ?? 'efectivo',
    referenceNumber: raw.reference_number ?? raw.referenceNumber ?? undefined,
    note: raw.note ?? undefined,
    createdAt: raw.created_at ?? raw.createdAt,
  };
}

function mapTripExpense(raw: any): TripExpense {
  return {
    id: raw.id,
    tripId: raw.trip_id ?? raw.tripId,
    amount: Number(raw.amount ?? 0),
    expenseDate: raw.expense_date ?? raw.expenseDate,
    category: raw.category ?? null,
    referenceNumber: raw.reference_number ?? raw.referenceNumber ?? null,
    note: raw.note ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
  };
}

export const useTripStore = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [changeLog, setChangeLog] = useState<TripChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tripFinanceSummary, setTripFinanceSummary] = useState<TripFinanceSummary | null>(null);
  const [tripIncomes, setTripIncomes] = useState<TripIncome[]>([]);
  const [tripExpenses, setTripExpenses] = useState<TripExpense[]>([]);

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
    // Defensive guard: if caller accidentally swaps args, recover automatically.
    const maybeSwapped = isProbablyJwt(invitationId) && isUuid(token);
    const finalInvitationId = maybeSwapped ? token : invitationId;
    const finalToken = maybeSwapped ? invitationId : token;
    await api.acceptTripInvitation(finalInvitationId, finalToken);
    setInvitations(prev => prev.filter(i => i.id !== finalInvitationId));
  }, []);

  const rejectInvitation = useCallback(async (invitationId: string, token: string) => {
    // Defensive guard: if caller accidentally swaps args, recover automatically.
    const maybeSwapped = isProbablyJwt(invitationId) && isUuid(token);
    const finalInvitationId = maybeSwapped ? token : invitationId;
    const finalToken = maybeSwapped ? invitationId : token;
    await api.rejectTripInvitation(finalInvitationId, finalToken);
    setInvitations(prev => prev.filter(i => i.id !== finalInvitationId));
  }, []);

  const createTrip = useCallback(
    async (
      token: string,
      data: {
        title: string;
        departureDate?: string;
        returnDate?: string;
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

  const addParticipants = useCallback(
    async (
      token: string,
      tripId: string,
      data: { clientIds?: string[]; staffMemberIds?: string[]; companions?: { name: string; phone?: string }[] }
    ) => {
    const updated = await api.addTripParticipants(tripId, data, token);
    const trip = mapTrip(updated);
    setTrips(prev => prev.map(t => (t.id === tripId ? trip : t)));
    if (currentTrip?.id === tripId) setCurrentTrip(trip);
    return trip;
    },
    [currentTrip?.id]
  );

  const removeParticipant = useCallback(async (token: string, tripId: string, participantId: string) => {
    await api.removeTripParticipant(tripId, participantId, token);
    const trip = await api.getTrip(tripId, token);
    const mapped = mapTrip(trip);
    setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
    if (currentTrip?.id === tripId) setCurrentTrip(mapped);
  }, [currentTrip?.id]);

  const updateParticipantPickup = useCallback(
    async (token: string, tripId: string, participantId: string, pickupLocation: string | null) => {
      await api.updateTripParticipantPickup(tripId, participantId, { pickupLocation }, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const setSeatAssignment = useCallback(
    async (
      token: string,
      tripId: string,
      participantId: string,
      seat: { seatNumber?: number; seatId?: string }
    ) => {
      await api.setTripSeatAssignment(
        tripId,
        { participantId, ...(seat.seatId != null ? { seatId: seat.seatId } : { seatNumber: seat.seatNumber! }) },
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
    async (token: string, tripId: string, opts: { participantId?: string; clientId?: string; seatId?: string }) => {
      await api.clearTripSeatAssignment(tripId, opts, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const attachTripHotel = useCallback(
    async (
      token: string,
      tripId: string,
      data: {
        hotelId: string;
        checkInDate: string;
        checkOutDate: string;
        reservedSingles: number;
        reservedDoubles: number;
        reservedTriples: number;
        notes?: string | null;
      }
    ) => {
      await api.attachHotelToTrip(tripId, data, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const updateTripHotelBooking = useCallback(
    async (
      token: string,
      tripId: string,
      tripHotelId: string,
      data: {
        checkInDate?: string;
        checkOutDate?: string;
        reservedSingles?: number;
        reservedDoubles?: number;
        reservedTriples?: number;
        notes?: string | null;
      }
    ) => {
      await api.updateTripHotel(tripId, tripHotelId, data, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const detachTripHotel = useCallback(
    async (token: string, tripId: string, tripHotelId: string) => {
      await api.detachTripHotel(tripId, tripHotelId, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const assignTripHotelRoom = useCallback(
    async (token: string, tripId: string, tripHotelId: string, roomId: string, participantId: string) => {
      await api.assignTripHotelRoom(tripId, tripHotelId, roomId, { participantId }, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const clearTripHotelRoomAssignment = useCallback(
    async (token: string, tripId: string, tripHotelId: string, roomId: string, participantId: string) => {
      await api.clearTripHotelRoomAssignment(tripId, tripHotelId, roomId, participantId, token);
      const trip = await api.getTrip(tripId, token);
      const mapped = mapTrip(trip);
      setTrips(prev => prev.map(t => (t.id === tripId ? mapped : t)));
      if (currentTrip?.id === tripId) setCurrentTrip(mapped);
    },
    [currentTrip?.id]
  );

  const clearCurrentTrip = useCallback(() => setCurrentTrip(null), []);

  const fetchTripFinance = useCallback(async (tripId: string, token: string) => {
    const response = await api.getTripFinance(tripId, token);
    const incomes = Array.isArray(response.incomes) ? response.incomes.map(mapTripIncome) : [];
    const expenses = Array.isArray(response.expenses) ? response.expenses.map(mapTripExpense) : [];
    setTripIncomes(incomes);
    setTripExpenses(expenses);
    setTripFinanceSummary({
      totalIncome: Number(response.summary?.totalIncome ?? 0),
      totalExpense: Number(response.summary?.totalExpense ?? 0),
      net: Number(response.summary?.net ?? 0),
    });
  }, []);

  const deleteTripIncome = useCallback(async (tripId: string, incomeId: string, token: string) => {
    await api.deleteTripIncome(tripId, incomeId, token);
    await fetchTripFinance(tripId, token);
  }, [fetchTripFinance]);

  const createTripExpense = useCallback(
    async (
      tripId: string,
      data: {
        amount: number;
        expenseDate: string;
        category?: string;
        referenceNumber?: string;
        note?: string;
      },
      token: string
    ) => {
      await api.createTripExpense(tripId, data, token);
      await fetchTripFinance(tripId, token);
    },
    [fetchTripFinance]
  );

  const deleteTripExpense = useCallback(async (tripId: string, expenseId: string, token: string) => {
    await api.deleteTripExpense(tripId, expenseId, token);
    await fetchTripFinance(tripId, token);
  }, [fetchTripFinance]);

  return {
    trips,
    currentTrip,
    invitations,
    changeLog,
    isLoading,
    tripFinanceSummary,
    tripIncomes,
    tripExpenses,
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
    updateParticipantPickup,
    setSeatAssignment,
    resetSeatAssignments,
    clearSeatAssignment,
    attachTripHotel,
    updateTripHotelBooking,
    detachTripHotel,
    assignTripHotelRoom,
    clearTripHotelRoomAssignment,
    clearCurrentTrip,
    fetchTripFinance,
    deleteTripIncome,
    createTripExpense,
    deleteTripExpense,
  };
};
