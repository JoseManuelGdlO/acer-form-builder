import { useState, useCallback } from 'react';
import { BusTemplate } from '@/types/form';
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

function mapBusTemplate(raw: any): BusTemplate {
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

export const useBusTemplateStore = () => {
  const [templates, setTemplates] = useState<BusTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<BusTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const response = await api.getBusTemplates(token);
      const list = Array.isArray(response) ? response : [];
      setTemplates(list.map(mapBusTemplate));
    } catch (error) {
      console.error('Failed to fetch bus templates:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTemplate = useCallback(async (id: string, token: string) => {
    try {
      const raw = await api.getBusTemplate(id, token);
      const template = mapBusTemplate(raw);
      setCurrentTemplate(template);
      setTemplates(prev => prev.map(t => (t.id === id ? template : t)));
      return template;
    } catch (error) {
      console.error('Failed to fetch bus template:', error);
      throw error;
    }
  }, []);

  const createTemplate = useCallback(
    async (token: string, data: Parameters<typeof api.createBusTemplate>[0]) => {
      const created = await api.createBusTemplate(data, token);
      const template = mapBusTemplate(created);
      setTemplates(prev => [template, ...prev]);
      return template;
    },
    []
  );

  const updateTemplate = useCallback(
    async (token: string, id: string, data: Parameters<typeof api.updateBusTemplate>[1]) => {
      const updated = await api.updateBusTemplate(id, data, token);
      const template = mapBusTemplate(updated);
      setTemplates(prev => prev.map(t => (t.id === id ? template : t)));
      if (currentTemplate?.id === id) setCurrentTemplate(template);
      return template;
    },
    [currentTemplate?.id]
  );

  const deleteTemplate = useCallback(async (token: string, id: string) => {
    await api.deleteBusTemplate(id, token);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (currentTemplate?.id === id) setCurrentTemplate(null);
  }, [currentTemplate?.id]);

  const clearCurrentTemplate = useCallback(() => setCurrentTemplate(null), []);

  return {
    templates,
    currentTemplate,
    isLoading,
    fetchTemplates,
    fetchTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    clearCurrentTemplate,
  };
};
