import { create } from 'zustand';
import { FAQ, BotBehavior, DEFAULT_BOT_BEHAVIOR } from '@/types/chatbot';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const BOT_BEHAVIOR_PERSIST_MS = 600;

let botBehaviorPersistTimer: ReturnType<typeof setTimeout> | null = null;

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

function strField(raw: Record<string, unknown>, camel: string, snake: string): string {
  const v = raw[camel] ?? raw[snake];
  return v == null ? '' : String(v);
}

function normalizeBotBehavior(raw: Record<string, unknown>): BotBehavior {
  const toneRaw = raw.tone;
  const tone =
    toneRaw === 'formal' || toneRaw === 'friendly' || toneRaw === 'professional'
      ? toneRaw
      : 'professional';

  return {
    name: strField(raw, 'name', 'name') || DEFAULT_BOT_BEHAVIOR.name,
    greeting: strField(raw, 'greeting', 'greeting') || DEFAULT_BOT_BEHAVIOR.greeting,
    personality: strField(raw, 'personality', 'personality'),
    tone,
    fallbackMessage:
      strField(raw, 'fallbackMessage', 'fallback_message') || DEFAULT_BOT_BEHAVIOR.fallbackMessage,
    responseDelay: Number(raw.responseDelay ?? raw.response_delay ?? 500),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    branchesText: strField(raw, 'branchesText', 'branches_text'),
    socialLinks: strField(raw, 'socialLinks', 'social_links'),
    contactPhone: strField(raw, 'contactPhone', 'contact_phone'),
  };
}

function botBehaviorToPayload(b: BotBehavior) {
  return {
    name: b.name,
    greeting: b.greeting,
    personality: b.personality,
    tone: b.tone,
    fallbackMessage: b.fallbackMessage,
    responseDelay: b.responseDelay,
    isActive: b.isActive,
    branchesText: b.branchesText,
    socialLinks: b.socialLinks,
    contactPhone: b.contactPhone,
  };
}

interface ChatbotStore {
  faqs: FAQ[];
  faqsLoading: boolean;
  botBehavior: BotBehavior;
  botBehaviorLoading: boolean;
  fetchFAQs: () => Promise<void>;
  fetchBotBehavior: () => Promise<void>;
  flushBotBehavior: () => Promise<void>;
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
  botBehaviorLoading: false,

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

  fetchBotBehavior: async () => {
    set({ botBehaviorLoading: true });
    try {
      const raw = await api.getBotBehavior();
      set({ botBehavior: normalizeBotBehavior(raw as Record<string, unknown>) });
    } catch (error) {
      console.error('Failed to fetch bot behavior:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar la configuración del bot');
      set({ botBehavior: DEFAULT_BOT_BEHAVIOR });
    } finally {
      set({ botBehaviorLoading: false });
    }
  },

  flushBotBehavior: async () => {
    if (!botBehaviorPersistTimer) {
      return;
    }
    clearTimeout(botBehaviorPersistTimer);
    botBehaviorPersistTimer = null;
    try {
      await api.updateBotBehavior(botBehaviorToPayload(get().botBehavior));
    } catch (error) {
      console.error('Failed to save bot behavior:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración del bot');
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
    if (botBehaviorPersistTimer) {
      clearTimeout(botBehaviorPersistTimer);
    }
    botBehaviorPersistTimer = setTimeout(() => {
      botBehaviorPersistTimer = null;
      api
        .updateBotBehavior(botBehaviorToPayload(get().botBehavior))
        .catch((error) => {
          console.error('Failed to save bot behavior:', error);
          toast.error(
            error instanceof Error ? error.message : 'No se pudo guardar la configuración del bot'
          );
        });
    }, BOT_BEHAVIOR_PERSIST_MS);
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
