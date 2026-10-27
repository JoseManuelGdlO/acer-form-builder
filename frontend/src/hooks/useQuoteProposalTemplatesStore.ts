import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { QuoteProposalBlock, QuoteProposalTemplate, QuoteServiceType } from '@/types/quote';

function mapBlock(raw: any): QuoteProposalBlock {
  return {
    id: raw.id ? String(raw.id) : undefined,
    blockType: raw.blockType ?? raw.block_type ?? 'custom',
    title: String(raw.title ?? ''),
    body: String(raw.body ?? ''),
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
  };
}

function mapTemplate(raw: any): QuoteProposalTemplate {
  return {
    id: String(raw.id),
    companyId: raw.companyId ?? raw.company_id ?? null,
    name: String(raw.name ?? ''),
    description: String(raw.description ?? ''),
    serviceType: (raw.serviceType ?? raw.service_type ?? null) as QuoteServiceType | null,
    isSystem: Boolean(raw.isSystem ?? raw.is_system),
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(mapBlock) : [],
    createdAt: raw.createdAt ?? raw.created_at,
    updatedAt: raw.updatedAt ?? raw.updated_at,
  };
}

export function useQuoteProposalTemplatesStore() {
  const [templates, setTemplates] = useState<QuoteProposalTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = useCallback(async (token: string, opts?: { includeInactive?: boolean }) => {
    setIsLoading(true);
    try {
      const raw = await api.listQuoteProposalTemplates(
        { includeInactive: opts?.includeInactive },
        token
      );
      const list = Array.isArray(raw) ? raw.map(mapTemplate) : [];
      setTemplates(list);
      return list;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createTemplate = useCallback(
    async (
      token: string,
      data: {
        name: string;
        description?: string;
        serviceType?: QuoteServiceType | null;
        blocks?: QuoteProposalBlock[];
      }
    ) => {
      const raw = await api.createQuoteProposalTemplate(
        {
          name: data.name,
          description: data.description ?? '',
          serviceType: data.serviceType ?? null,
          blocks: data.blocks ?? [],
        },
        token
      );
      const mapped = mapTemplate(raw);
      setTemplates((prev) => [mapped, ...prev]);
      return mapped;
    },
    []
  );

  const updateTemplate = useCallback(
    async (
      token: string,
      id: string,
      data: {
        name?: string;
        description?: string;
        serviceType?: QuoteServiceType | null;
        isActive?: boolean;
        blocks?: QuoteProposalBlock[];
      }
    ) => {
      const raw = await api.updateQuoteProposalTemplate(id, data as Record<string, unknown>, token);
      const mapped = mapTemplate(raw);
      setTemplates((prev) => prev.map((item) => (item.id === id ? mapped : item)));
      return mapped;
    },
    []
  );

  const cloneTemplate = useCallback(async (token: string, id: string) => {
    const raw = await api.cloneQuoteProposalTemplate(id, token);
    const mapped = mapTemplate(raw);
    setTemplates((prev) => [mapped, ...prev]);
    return mapped;
  }, []);

  const deactivateTemplate = useCallback(async (token: string, id: string) => {
    await api.deleteQuoteProposalTemplate(id, token);
    setTemplates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: false } : item))
    );
  }, []);

  return {
    templates,
    isLoading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    cloneTemplate,
    deactivateTemplate,
  };
}
