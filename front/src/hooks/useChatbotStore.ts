import { create } from 'zustand';
import { FAQ, BotBehavior, DEFAULT_BOT_BEHAVIOR } from '@/types/chatbot';
import { api } from '@/lib/api';

function normalizeFaq(raw: any): FAQ {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
    category: raw.category ?? undefined,
    order: raw.order ?? 0,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  };
}

interface ChatbotStore {
  faqs: FAQ[];
  faqsLoading: boolean;
  botBehavior: BotBehavior;
  fetchFAQs: () => Promise<void>;
  addFAQ: (question: string, answer: string, category?: string) => Promise<void>;
  updateFAQ: (id: string, updates: Partial<Omit<FAQ, 'id' | 'createdAt'>>) => Promise<void>;
  deleteFAQ: (id: string) => Promise<void>;
  toggleFAQStatus: (id: string) => Promise<void>;
  reorderFAQs: (faqs: FAQ[]) => void;
  updateBotBehavior: (updates: Partial<BotBehavior>) => void;
  getFAQStats: () => { total: number; active: number; inactive: number };
}

export const useChatbotStore = create<ChatbotStore>((set, get) => ({
  faqs: [],
  faqsLoading: false,
  botBehavior: DEFAULT_BOT_BEHAVIOR,

  fetchFAQs: async () => {
    set({ faqsLoading: true });
    try {
      const data = await api.getFAQs();
      const list = Array.isArray(data) ? data : [];
      set({ faqs: list.map(normalizeFaq) });
    } catch (error) {
      console.error('Failed to fetch FAQs:', error);
      set({ faqs: [] });
    } finally {
      set({ faqsLoading: false });
    }
  },

  addFAQ: async (question, answer, category) => {
    const order = get().faqs.length;
    const payload = { question, answer, ...(category != null && category !== '' && { category }), order };
    const raw = await api.createFAQ(payload);
    const normalized = normalizeFaq(raw);
    set((state) => ({ faqs: [...state.faqs, normalized] }));
  },

  updateFAQ: async (id, updates) => {
    const raw = await api.updateFAQ(id, updates);
    const normalized = normalizeFaq(raw);
    set((state) => ({
      faqs: state.faqs.map((faq) => (faq.id === id ? normalized : faq)),
    }));
  },

  deleteFAQ: async (id) => {
    await api.deleteFAQ(id);
    set((state) => ({ faqs: state.faqs.filter((faq) => faq.id !== id) }));
  },

  toggleFAQStatus: async (id) => {
    const faq = get().faqs.find((f) => f.id === id);
    if (!faq) return;
    await get().updateFAQ(id, { isActive: !faq.isActive });
  },

  reorderFAQs: (faqs) => {
    set({ faqs: faqs.map((faq, index) => ({ ...faq, order: index })) });
  },

  updateBotBehavior: (updates) => {
    set((state) => ({
      botBehavior: { ...state.botBehavior, ...updates },
    }));
  },

  getFAQStats: () => {
    const faqs = get().faqs;
    return {
      total: faqs.length,
      active: faqs.filter((f) => f.isActive).length,
      inactive: faqs.filter((f) => !f.isActive).length,
    };
  },
}));
