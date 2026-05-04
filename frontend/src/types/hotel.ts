/** Catálogo: hotel por empresa */
export interface Hotel {
  id: string;
  companyId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  totalSingleRooms: number;
  totalDoubleRooms: number;
  totalTripleRooms: number;
  createdAt?: string;
  updatedAt?: string;
}

export type TripHotelRoomType = 'single' | 'double' | 'triple';

export interface TripHotelRoomAssignmentParticipant {
  id: string;
  participantType?: 'client' | 'companion' | 'staff';
  name?: string | null;
  phone?: string | null;
  role?: string | null;
  clientId?: string | null;
  staffMemberId?: string | null;
  pickupLocation?: string | null;
  client?: {
    id: string;
    name: string;
    email?: string;
    phone?: string | null;
    companyId?: string;
  } | null;
  staffMember?: {
    id: string;
    name: string;
    phone?: string | null;
    role?: string | null;
  } | null;
}

export interface TripHotelRoomAssignmentRow {
  id: string;
  tripHotelRoomId: string;
  participantId: string;
  participant?: TripHotelRoomAssignmentParticipant;
}

export interface TripHotelRoomRow {
  id: string;
  tripHotelId: string;
  roomType: TripHotelRoomType;
  label: string;
  sortOrder: number;
  assignments?: TripHotelRoomAssignmentRow[];
}

/** Reserva de hotel en un viaje (trip_hotels + habitaciones) */
export interface TripHotelBooking {
  id: string;
  tripId: string;
  hotelId: string;
  hotel?: Hotel;
  checkInDate: string;
  checkOutDate: string;
  reservedSingles: number;
  reservedDoubles: number;
  reservedTriples: number;
  notes?: string | null;
  rooms?: TripHotelRoomRow[];
  createdAt?: string;
  updatedAt?: string;
}
