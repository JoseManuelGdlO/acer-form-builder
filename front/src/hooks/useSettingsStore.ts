import { create } from 'zustand';
import { ChecklistTemplate, VisaStatusTemplate } from '@/types/settings';
import { api } from '@/lib/api';

interface SettingsState {
  checklistTemplates: ChecklistTemplate[];
  visaStatusTemplates: VisaStatusTemplate[];
  isLoading: boolean;
  fetchChecklistTemplates: (token?: string | null) => Promise<void>;
  addChecklistItem: (label: string, token?: string | null) => Promise<void>;
  updateChecklistItem: (id: string, updates: Partial<ChecklistTemplate>, token?: string | null) => Promise<void>;
  deleteChecklistItem: (id: string, token?: string | null) => Promise<void>;
  toggleChecklistItem: (id: string, token?: string | null) => Promise<void>;
  reorderChecklistItems: (items: ChecklistTemplate[]) => void;
  getActiveChecklistItems: () => ChecklistTemplate[];
  fetchVisaStatusTemplates: (token?: string | null) => Promise<void>;
  addVisaStatusItem: (label: string, token?: string | null) => Promise<void>;
  updateVisaStatusItem: (id: string, updates: Partial<VisaStatusTemplate>, token?: string | null) => Promise<void>;
  deleteVisaStatusItem: (id: string, token?: string | null) => Promise<void>;
  toggleVisaStatusItem: (id: string, token?: string | null) => Promise<void>;
  getActiveVisaStatusItems: () => VisaStatusTemplate[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  checklistTemplates: [],
  visaStatusTemplates: [],
  isLoading: false,

  fetchChecklistTemplates: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const templates = await api.getChecklistTemplates();
      const mappedTemplates: ChecklistTemplate[] = templates.map((t: any) => ({
        id: t.id,
        label: t.label,
        order: t.order || 0,
        isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
        createdAt: new Date(t.created_at || t.createdAt || Date.now()),
      }));
      
      // Remove duplicates by id before setting
      const uniqueTemplates = mappedTemplates.filter((template, index, self) => 
        index === self.findIndex(t => t.id === template.id)
      );
      
      set({ checklistTemplates: uniqueTemplates, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch checklist templates:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  addChecklistItem: async (label: string, token?: string | null) => {
    try {
      const order = get().checklistTemplates.length;
      const newTemplate = await api.createChecklistTemplate(
        { label, order, isActive: true },
        token
      );
      const newItem: ChecklistTemplate = {
        id: newTemplate.id,
        label: newTemplate.label,
        order: newTemplate.order || order,
        isActive: newTemplate.is_active !== undefined ? newTemplate.is_active : newTemplate.isActive !== undefined ? newTemplate.isActive : true,
        createdAt: new Date(newTemplate.created_at || newTemplate.createdAt || Date.now()),
      };
      set((state) => {
        // Check if item already exists to avoid duplicates
        const exists = state.checklistTemplates.some(item => item.id === newItem.id);
        if (exists) {
          return state;
        }
        return {
          checklistTemplates: [...state.checklistTemplates, newItem],
        };
      });
    } catch (error) {
      console.error('Failed to create checklist template:', error);
      throw error;
    }
  },

  updateChecklistItem: async (id: string, updates: Partial<ChecklistTemplate>, token?: string | null) => {
    try {
      const existingItem = get().checklistTemplates.find((item) => item.id === id);
      if (!existingItem) {
        throw new Error('Checklist item not found');
      }

      const updateData: any = {};
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const updatedTemplate = await api.updateChecklistTemplate(id, updateData, token);
      
      const updatedItem: ChecklistTemplate = {
        id: updatedTemplate.id,
        label: updatedTemplate.label,
        order: updatedTemplate.order || existingItem.order,
        isActive: updatedTemplate.is_active !== undefined ? updatedTemplate.is_active : updatedTemplate.isActive !== undefined ? updatedTemplate.isActive : existingItem.isActive,
        createdAt: existingItem.createdAt,
      };

      set((state) => ({
        checklistTemplates: state.checklistTemplates.map((item) =>
          item.id === id ? updatedItem : item
        ),
      }));
    } catch (error) {
      console.error('Failed to update checklist template:', error);
      throw error;
    }
  },

  deleteChecklistItem: async (id: string, token?: string | null) => {
    try {
      await api.deleteChecklistTemplate(id, token);
      set((state) => ({
        checklistTemplates: state.checklistTemplates.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete checklist template:', error);
      throw error;
    }
  },

  toggleChecklistItem: async (id: string, token?: string | null) => {
    try {
      const existingItem = get().checklistTemplates.find((item) => item.id === id);
      if (!existingItem) {
        throw new Error('Checklist item not found');
      }

      const newActiveStatus = !existingItem.isActive;
      await get().updateChecklistItem(id, { isActive: newActiveStatus }, token);
    } catch (error) {
      console.error('Failed to toggle checklist template:', error);
      throw error;
    }
  },

  reorderChecklistItems: (items: ChecklistTemplate[]) => {
    set({
      checklistTemplates: items.map((item, index) => ({ ...item, order: index })),
    });
  },

  getActiveChecklistItems: () => {
    return get()
      .checklistTemplates
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order);
  },

  fetchVisaStatusTemplates: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const templates = await api.getVisaStatusTemplates(token);
      const mappedTemplates: VisaStatusTemplate[] = templates.map((t: any) => ({
        id: t.id,
        label: t.label,
        order: t.order || 0,
        isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
        createdAt: new Date(t.created_at || t.createdAt || Date.now()),
      }));

      const uniqueTemplates = mappedTemplates.filter((template, index, self) =>
        index === self.findIndex(t => t.id === template.id)
      );

      set({ visaStatusTemplates: uniqueTemplates, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch visa status templates:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  addVisaStatusItem: async (label: string, token?: string | null) => {
    try {
      const order = get().visaStatusTemplates.length;
      const newTemplate = await api.createVisaStatusTemplate({ label, order, isActive: true }, token);
      const newItem: VisaStatusTemplate = {
        id: newTemplate.id,
        label: newTemplate.label,
        order: newTemplate.order || order,
        isActive: newTemplate.is_active !== undefined ? newTemplate.is_active : newTemplate.isActive !== undefined ? newTemplate.isActive : true,
        createdAt: new Date(newTemplate.created_at || newTemplate.createdAt || Date.now()),
      };
      set((state) => {
        const exists = state.visaStatusTemplates.some(item => item.id === newItem.id);
        if (exists) return state;
        return { visaStatusTemplates: [...state.visaStatusTemplates, newItem] };
      });
    } catch (error) {
      console.error('Failed to create visa status template:', error);
      throw error;
    }
  },

  updateVisaStatusItem: async (id: string, updates: Partial<VisaStatusTemplate>, token?: string | null) => {
    try {
      const existingItem = get().visaStatusTemplates.find((item) => item.id === id);
      if (!existingItem) throw new Error('Visa status item not found');

      const updateData: any = {};
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const updatedTemplate = await api.updateVisaStatusTemplate(id, updateData, token);
      const updatedItem: VisaStatusTemplate = {
        id: updatedTemplate.id,
        label: updatedTemplate.label,
        order: updatedTemplate.order || existingItem.order,
        isActive: updatedTemplate.is_active !== undefined ? updatedTemplate.is_active : updatedTemplate.isActive !== undefined ? updatedTemplate.isActive : existingItem.isActive,
        createdAt: existingItem.createdAt,
      };

      set((state) => ({
        visaStatusTemplates: state.visaStatusTemplates.map((item) => (item.id === id ? updatedItem : item)),
      }));
    } catch (error) {
      console.error('Failed to update visa status template:', error);
      throw error;
    }
  },

  deleteVisaStatusItem: async (id: string, token?: string | null) => {
    try {
      await api.deleteVisaStatusTemplate(id, token);
      set((state) => ({
        visaStatusTemplates: state.visaStatusTemplates.filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete visa status template:', error);
      throw error;
    }
  },

  toggleVisaStatusItem: async (id: string, token?: string | null) => {
    const existingItem = get().visaStatusTemplates.find((item) => item.id === id);
    if (!existingItem) throw new Error('Visa status item not found');
    const newActiveStatus = !existingItem.isActive;
    await get().updateVisaStatusItem(id, { isActive: newActiveStatus }, token);
  },

  getActiveVisaStatusItems: () => {
    return get()
      .visaStatusTemplates
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order);
  },
}));
