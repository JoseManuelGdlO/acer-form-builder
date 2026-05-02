import { useState, useCallback } from 'react';
import type { Hotel } from '@/types/hotel';
import { api } from '@/lib/api';

export const useHotelStore = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mapHotel = (h: any): Hotel => ({
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
  });

  const fetchHotels = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getHotels(token);
      const list = Array.isArray(response) ? response : [];
      setHotels(list.map(mapHotel));
    } catch (error) {
      console.error('Failed to fetch hotels:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createHotel = useCallback(
    async (
      token: string,
      data: {
        name: string;
        address?: string | null;
        city?: string | null;
        country?: string | null;
        phone?: string | null;
        email?: string | null;
        notes?: string | null;
        totalSingleRooms?: number;
        totalDoubleRooms?: number;
        totalTripleRooms?: number;
      }
    ) => {
      const created = await api.createHotel(data, token);
      const hotel = mapHotel(created);
      setHotels((prev) => [hotel, ...prev]);
      return hotel;
    },
    []
  );

  const updateHotel = useCallback(
    async (
      token: string,
      id: string,
      data: {
        name?: string;
        address?: string | null;
        city?: string | null;
        country?: string | null;
        phone?: string | null;
        email?: string | null;
        notes?: string | null;
        totalSingleRooms?: number;
        totalDoubleRooms?: number;
        totalTripleRooms?: number;
      }
    ) => {
      const updated = await api.updateHotel(id, data, token);
      const hotel = mapHotel(updated);
      setHotels((prev) => prev.map((h) => (h.id === id ? hotel : h)));
      return hotel;
    },
    []
  );

  const deleteHotel = useCallback(async (token: string, id: string) => {
    await api.deleteHotel(id, token);
    setHotels((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const replaceHotels = useCallback((next: Hotel[]) => {
    setHotels(next);
  }, []);

  return {
    hotels,
    isLoading,
    fetchHotels,
    createHotel,
    updateHotel,
    deleteHotel,
    replaceHotels,
  };
};
