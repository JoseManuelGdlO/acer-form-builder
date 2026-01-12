import { create } from 'zustand';
import { FAQ, BotBehavior, DEFAULT_BOT_BEHAVIOR } from '@/types/chatbot';

interface ChatbotStore {
  faqs: FAQ[];
  botBehavior: BotBehavior;
  addFAQ: (question: string, answer: string, category?: string) => void;
  updateFAQ: (id: string, updates: Partial<Omit<FAQ, 'id' | 'createdAt'>>) => void;
  deleteFAQ: (id: string) => void;
  toggleFAQStatus: (id: string) => void;
  reorderFAQs: (faqs: FAQ[]) => void;
  updateBotBehavior: (updates: Partial<BotBehavior>) => void;
  getFAQStats: () => { total: number; active: number; inactive: number };
}

const mockFAQs: FAQ[] = [
  {
    id: '1',
    question: '¿Cuánto tiempo tarda el proceso de visa?',
    answer: 'El tiempo de procesamiento varía según el tipo de visa. Generalmente, las visas de turismo tardan entre 2 a 4 semanas, mientras que las visas de trabajo pueden tardar de 4 a 8 semanas.',
    category: 'Tiempos',
    order: 0,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    question: '¿Qué documentos necesito para mi cita?',
    answer: 'Los documentos básicos incluyen: pasaporte vigente, fotografías tamaño pasaporte, comprobante de domicilio, estados de cuenta bancarios y carta de empleo o comprobante de ingresos.',
    category: 'Documentos',
    order: 1,
    isActive: true,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: '3',
    question: '¿Cuál es el costo del servicio?',
    answer: 'Nuestros precios varían según el tipo de trámite. Contáctanos para recibir una cotización personalizada según tu caso específico.',
    category: 'Precios',
    order: 2,
    isActive: true,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
];

export const useChatbotStore = create<ChatbotStore>((set, get) => ({
  faqs: mockFAQs,
  botBehavior: DEFAULT_BOT_BEHAVIOR,

  addFAQ: (question, answer, category) => {
    const newFAQ: FAQ = {
      id: crypto.randomUUID(),
      question,
      answer,
      category,
      order: get().faqs.length,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({ faqs: [...state.faqs, newFAQ] }));
  },

  updateFAQ: (id, updates) => {
    set((state) => ({
      faqs: state.faqs.map((faq) =>
        faq.id === id ? { ...faq, ...updates, updatedAt: new Date() } : faq
      ),
    }));
  },

  deleteFAQ: (id) => {
    set((state) => ({ faqs: state.faqs.filter((faq) => faq.id !== id) }));
  },

  toggleFAQStatus: (id) => {
    set((state) => ({
      faqs: state.faqs.map((faq) =>
        faq.id === id
          ? { ...faq, isActive: !faq.isActive, updatedAt: new Date() }
          : faq
      ),
    }));
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
