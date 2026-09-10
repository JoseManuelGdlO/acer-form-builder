import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { Quote, QuoteTemplate, QuoteWritePayload } from '@/types/quote';

function mapQuote(raw: any): Quote {
  return {
    id: String(raw.id),
    companyId: String(raw.companyId ?? raw.company_id ?? ''),
    clientId: String(raw.clientId ?? raw.client_id ?? ''),
    clientName: String(raw.clientName ?? raw.client_name ?? ''),
    folio: String(raw.folio ?? ''),
    title: String(raw.title ?? ''),
    type: raw.type ?? raw.serviceType ?? 'lodging',
    hotel: String(raw.hotel ?? ''),
    advisorName: String(raw.advisorName ?? raw.advisor_name ?? ''),
    advisorUserId: raw.advisorUserId ?? raw.advisor_user_id ?? null,
    totalAmount: raw.totalAmount != null ? Number(raw.totalAmount) : raw.total_amount != null ? Number(raw.total_amount) : null,
    advanceAmount:
      raw.advanceAmount != null ? Number(raw.advanceAmount) : raw.advance_amount != null ? Number(raw.advance_amount) : null,
    currency: String(raw.currency || 'MXN'),
    startDate: raw.startDate ?? raw.start_date ?? null,
    endDate: raw.endDate ?? raw.end_date ?? null,
    validUntil: raw.validUntil ?? raw.valid_until ?? null,
    status: raw.status ?? 'draft',
    origin: raw.origin ?? 'system',
    notes: String(raw.notes ?? ''),
    includes: Array.isArray(raw.includes) ? raw.includes : [],
    excludes: Array.isArray(raw.excludes) ? raw.excludes : [],
    terms: String(raw.terms ?? ''),
    track: Array.isArray(raw.track) ? raw.track : [],
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

function mapTemplate(raw: any): QuoteTemplate {
  return {
    id: raw.id,
    company: String(raw.company ?? ''),
    contact: String(raw.contact ?? ''),
    title: String(raw.title ?? ''),
    footer: String(raw.footer ?? ''),
    headerColor: String(raw.headerColor ?? raw.header_color ?? '#1379BE'),
    accentColor: String(raw.accentColor ?? raw.accent_color ?? '#D51E26'),
    showLogo: Boolean(raw.showLogo ?? raw.show_logo ?? true),
    includes: String(raw.includes ?? ''),
    excludes: String(raw.excludes ?? ''),
    terms: String(raw.terms ?? ''),
  };
}

export function useQuotesStore() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [template, setTemplate] = useState<QuoteTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuotes = useCallback(async (token: string, params?: { clientId?: string; status?: string; q?: string }) => {
    setIsLoading(true);
    try {
      const response = await api.getQuotes(params, token);
      const list = Array.isArray(response) ? response.map(mapQuote) : [];
      setQuotes(list);
      return list;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchQuote = useCallback(async (token: string, id: string) => {
    const raw = await api.getQuote(id, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => {
      const idx = prev.findIndex((item) => item.id === quote.id);
      if (idx === -1) return [quote, ...prev];
      const next = [...prev];
      next[idx] = quote;
      return next;
    });
    return quote;
  }, []);

  const fetchTemplate = useCallback(async (token: string) => {
    const raw = await api.getQuoteTemplate(token);
    const mapped = mapTemplate(raw);
    setTemplate(mapped);
    return mapped;
  }, []);

  const saveTemplate = useCallback(async (token: string, data: QuoteTemplate) => {
    const raw = await api.updateQuoteTemplate(
      {
        company: data.company,
        contact: data.contact,
        title: data.title,
        footer: data.footer,
        headerColor: data.headerColor,
        accentColor: data.accentColor,
        showLogo: data.showLogo,
        includes: data.includes,
        excludes: data.excludes,
        terms: data.terms,
      },
      token
    );
    const mapped = mapTemplate(raw);
    setTemplate(mapped);
    return mapped;
  }, []);

  const createQuote = useCallback(async (token: string, data: QuoteWritePayload) => {
    const raw = await api.createQuote(data, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => [quote, ...prev.filter((item) => item.id !== quote.id)]);
    return quote;
  }, []);

  const updateQuote = useCallback(async (token: string, id: string, data: Partial<QuoteWritePayload>) => {
    const raw = await api.updateQuote(id, data, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => prev.map((item) => (item.id === id ? quote : item)));
    return quote;
  }, []);

  const updateStatus = useCallback(async (token: string, id: string, status: Quote['status']) => {
    const raw = await api.updateQuoteStatus(id, status, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => prev.map((item) => (item.id === id ? quote : item)));
    return quote;
  }, []);

  const linkQuote = useCallback(async (token: string, id: string, clientId: string) => {
    const raw = await api.linkQuote(id, clientId, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => prev.map((item) => (item.id === id ? quote : item)));
    return quote;
  }, []);

  const addEvent = useCallback(async (token: string, id: string, label?: string) => {
    const raw = await api.addQuoteEvent(id, label, token);
    const quote = mapQuote(raw);
    setQuotes((prev) => prev.map((item) => (item.id === id ? quote : item)));
    return quote;
  }, []);

  const removeQuote = useCallback(async (token: string, id: string) => {
    await api.deleteQuote(id, token);
    setQuotes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    quotes,
    template,
    isLoading,
    fetchQuotes,
    fetchQuote,
    fetchTemplate,
    saveTemplate,
    createQuote,
    updateQuote,
    updateStatus,
    linkQuote,
    addEvent,
    removeQuote,
  };
}
