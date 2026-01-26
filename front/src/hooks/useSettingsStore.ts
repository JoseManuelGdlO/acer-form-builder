import { create } from 'zustand';
import { ChecklistTemplate } from '@/types/settings';
import { api } from '@/lib/api';

interface SettingsState {
  checklistTemplates: ChecklistTemplate[];
  isLoading: boolean;
  fetchChecklistTemplates: (token?: string | null) => Promise<void>;
  addChecklistItem: (label: string, token?: string | null) => Promise<void>;
  updateChecklistItem: (id: string, updates: Partial<ChecklistTemplate>, token?: string | null) => Promise<void>;
  deleteChecklistItem: (id: string, token?: string | null) => Promise<void>;
  toggleChecklistItem: (id: string, token?: string | null) => Promise<void>;
  reorderChecklistItems: (items: ChecklistTemplate[]) => void;
  getActiveChecklistItems: () => ChecklistTemplate[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  checklistTemplates: [],
  isLoading: false,

  fetchChecklistTemplates: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const templates = await api.getChecklistTemplates();
      const checklistTemplates: ChecklistTemplate[] = templates.map((t: any) => ({
        id: t.id,
        label: t.label,
        order: t.order || 0,
        isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
        createdAt: new Date(t.created_at || t.createdAt || Date.now()),
      }));
      set({ checklistTemplates, isLoading: false });
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
      set((state) => ({
        checklistTemplates: [...state.checklistTemplates, newItem],
      }));
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
}));
