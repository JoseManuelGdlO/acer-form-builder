import { create } from 'zustand';
import { Branch, ChecklistTemplate } from '@/types/settings';
import { api } from '@/lib/api';

interface SettingsState {
  checklistTemplates: ChecklistTemplate[];
  branches: Branch[];
  isLoading: boolean;
  fetchChecklistTemplates: (token?: string | null) => Promise<void>;
  addChecklistItem: (label: string, token?: string | null) => Promise<void>;
  updateChecklistItem: (id: string, updates: Partial<ChecklistTemplate>, token?: string | null) => Promise<void>;
  deleteChecklistItem: (id: string, token?: string | null) => Promise<void>;
  toggleChecklistItem: (id: string, token?: string | null) => Promise<void>;
  reorderChecklistItems: (items: ChecklistTemplate[]) => void;
  getActiveChecklistItems: () => ChecklistTemplate[];

  fetchBranches: (token?: string | null) => Promise<void>;
  addBranch: (name: string, token?: string | null, isActive?: boolean) => Promise<void>;
  updateBranch: (id: string, updates: Partial<Branch>, token?: string | null) => Promise<void>;
  deleteBranch: (id: string, token?: string | null) => Promise<void>;
  toggleBranch: (id: string, token?: string | null) => Promise<void>;
  getActiveBranches: () => Branch[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  checklistTemplates: [],
  branches: [],
  isLoading: false,

  fetchChecklistTemplates: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const templates = await api.getChecklistTemplates();
      const mappedTemplates: ChecklistTemplate[] = templates.map(
        (t: {
          id: string;
          label: string;
          order?: number;
          is_active?: boolean;
          isActive?: boolean;
          created_at?: string;
          createdAt?: Date;
        }) => ({
          id: t.id,
          label: t.label,
          order: t.order || 0,
          isActive: t.is_active !== undefined ? t.is_active : t.isActive !== undefined ? t.isActive : true,
          createdAt: new Date(t.created_at || t.createdAt || Date.now()),
        })
      );

      const uniqueTemplates = mappedTemplates.filter(
        (template, index, self) => index === self.findIndex((t) => t.id === template.id)
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
      const newTemplate = await api.createChecklistTemplate({ label, order, isActive: true }, token);
      const newItem: ChecklistTemplate = {
        id: newTemplate.id,
        label: newTemplate.label,
        order: newTemplate.order || order,
        isActive:
          newTemplate.is_active !== undefined
            ? newTemplate.is_active
            : newTemplate.isActive !== undefined
              ? newTemplate.isActive
              : true,
        createdAt: new Date(newTemplate.created_at || newTemplate.createdAt || Date.now()),
      };
      set((state) => {
        const exists = state.checklistTemplates.some((item) => item.id === newItem.id);
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

      const updateData: Record<string, unknown> = {};
      if (updates.label !== undefined) updateData.label = updates.label;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const updatedTemplate = await api.updateChecklistTemplate(id, updateData, token);

      const updatedItem: ChecklistTemplate = {
        id: updatedTemplate.id,
        label: updatedTemplate.label,
        order: updatedTemplate.order || existingItem.order,
        isActive:
          updatedTemplate.is_active !== undefined
            ? updatedTemplate.is_active
            : updatedTemplate.isActive !== undefined
              ? updatedTemplate.isActive
              : existingItem.isActive,
        createdAt: existingItem.createdAt,
      };

      set((state) => ({
        checklistTemplates: state.checklistTemplates.map((item) => (item.id === id ? updatedItem : item)),
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
      .checklistTemplates.filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order);
  },

  fetchBranches: async (token?: string | null) => {
    set({ isLoading: true });
    try {
      const branches = await api.getBranches(token);
      const mappedBranches: Branch[] = branches.map(
        (b: {
          id: string;
          name: string;
          is_active?: boolean;
          isActive?: boolean;
          created_at?: string;
          createdAt?: Date;
        }) => ({
          id: b.id,
          name: b.name,
          isActive: b.is_active !== undefined ? b.is_active : b.isActive !== undefined ? b.isActive : true,
          createdAt: new Date(b.created_at || b.createdAt || Date.now()),
        })
      );

      const uniqueBranches = mappedBranches.filter(
        (branch, index, self) => index === self.findIndex((x) => x.id === branch.id)
      );
      set({ branches: uniqueBranches, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  addBranch: async (name: string, token?: string | null, isActive = true) => {
    try {
      const newBranch = await api.createBranch({ name, isActive }, token);
      const item: Branch = {
        id: newBranch.id,
        name: newBranch.name,
        isActive:
          newBranch.is_active !== undefined
            ? newBranch.is_active
            : newBranch.isActive !== undefined
              ? newBranch.isActive
              : true,
        createdAt: new Date(newBranch.created_at || newBranch.createdAt || Date.now()),
      };

      set((state) => {
        const exists = state.branches.some((b) => b.id === item.id);
        if (exists) return state;
        return { branches: [...state.branches, item] };
      });
    } catch (error) {
      console.error('Failed to create branch:', error);
      throw error;
    }
  },

  updateBranch: async (id: string, updates: Partial<Branch>, token?: string | null) => {
    try {
      const existingItem = get().branches.find((b) => b.id === id);
      if (!existingItem) throw new Error('Branch not found');

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

      const updated = await api.updateBranch(id, updateData, token);
      const updatedItem: Branch = {
        id: updated.id,
        name: updated.name,
        isActive:
          updated.is_active !== undefined
            ? updated.is_active
            : updated.isActive !== undefined
              ? updated.isActive
              : existingItem.isActive,
        createdAt: existingItem.createdAt,
      };

      set((state) => ({
        branches: state.branches.map((b) => (b.id === id ? updatedItem : b)),
      }));
    } catch (error) {
      console.error('Failed to update branch:', error);
      throw error;
    }
  },

  deleteBranch: async (id: string, token?: string | null) => {
    try {
      await api.deleteBranch(id, token);
      set((state) => ({
        branches: state.branches.map((b) => (b.id === id ? { ...b, isActive: false } : b)),
      }));
    } catch (error) {
      console.error('Failed to delete branch:', error);
      throw error;
    }
  },

  toggleBranch: async (id: string, token?: string | null) => {
    const existingItem = get().branches.find((b) => b.id === id);
    if (!existingItem) throw new Error('Branch not found');
    const newActiveStatus = !existingItem.isActive;
    await get().updateBranch(id, { isActive: newActiveStatus }, token);
  },

  getActiveBranches: () => {
    return get()
      .branches.filter((b) => b.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
}));
