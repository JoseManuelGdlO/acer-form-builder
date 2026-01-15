import { create } from 'zustand';
import { ChecklistTemplate, DEFAULT_CHECKLIST_TEMPLATES } from '@/types/settings';

interface SettingsState {
  checklistTemplates: ChecklistTemplate[];
  addChecklistItem: (label: string) => void;
  updateChecklistItem: (id: string, updates: Partial<ChecklistTemplate>) => void;
  deleteChecklistItem: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  reorderChecklistItems: (items: ChecklistTemplate[]) => void;
  getActiveChecklistItems: () => ChecklistTemplate[];
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  checklistTemplates: DEFAULT_CHECKLIST_TEMPLATES,

  addChecklistItem: (label: string) => {
    const newItem: ChecklistTemplate = {
      id: Date.now().toString(),
      label,
      order: get().checklistTemplates.length,
      isActive: true,
      createdAt: new Date(),
    };
    set((state) => ({
      checklistTemplates: [...state.checklistTemplates, newItem],
    }));
  },

  updateChecklistItem: (id: string, updates: Partial<ChecklistTemplate>) => {
    set((state) => ({
      checklistTemplates: state.checklistTemplates.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  },

  deleteChecklistItem: (id: string) => {
    set((state) => ({
      checklistTemplates: state.checklistTemplates.filter((item) => item.id !== id),
    }));
  },

  toggleChecklistItem: (id: string) => {
    set((state) => ({
      checklistTemplates: state.checklistTemplates.map((item) =>
        item.id === id ? { ...item, isActive: !item.isActive } : item
      ),
    }));
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
