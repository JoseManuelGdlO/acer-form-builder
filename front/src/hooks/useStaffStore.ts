import { useState, useCallback } from 'react';
import { StaffMember } from '@/types/form';
import { api } from '@/lib/api';

function mapStaffMember(raw: any): StaffMember {
  return {
    id: raw.id,
    companyId: raw.company_id ?? raw.companyId,
    name: raw.name,
    phone: raw.phone ?? null,
    role: raw.role ?? null,
    notes: raw.notes ?? null,
    createdAt: raw.created_at ?? raw.createdAt,
    updatedAt: raw.updated_at ?? raw.updatedAt,
  };
}

export const useStaffStore = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const fetchStaffMembers = useCallback(async (token: string) => {
    const response = await api.getStaffMembers(token);
    const list = Array.isArray(response) ? response : [];
    setStaffMembers(list.map(mapStaffMember));
  }, []);

  const createStaffMember = useCallback(
    async (
      token: string,
      data: { name: string; phone?: string | null; role?: string | null; notes?: string | null }
    ) => {
      const created = await api.createStaffMember(data, token);
      const mapped = mapStaffMember(created);
      setStaffMembers((prev) => [mapped, ...prev]);
      return mapped;
    },
    []
  );

  const updateStaffMember = useCallback(
    async (
      token: string,
      id: string,
      data: { name?: string; phone?: string | null; role?: string | null; notes?: string | null }
    ) => {
      const updated = await api.updateStaffMember(id, data, token);
      const mapped = mapStaffMember(updated);
      setStaffMembers((prev) => prev.map((it) => (it.id === id ? mapped : it)));
      return mapped;
    },
    []
  );

  const deleteStaffMember = useCallback(async (token: string, id: string) => {
    await api.deleteStaffMember(id, token);
    setStaffMembers((prev) => prev.filter((it) => it.id !== id));
  }, []);

  return {
    staffMembers,
    fetchStaffMembers,
    createStaffMember,
    updateStaffMember,
    deleteStaffMember,
  };
};
