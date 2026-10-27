import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { TabBar } from '@/components/layout/TabBar';
import { QuoteTemplateEditor } from '@/components/quotes/QuoteTemplateEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useQuoteProposalTemplatesStore } from '@/hooks/useQuoteProposalTemplatesStore';
import { useQuotesStore } from '@/hooks/useQuotesStore';
import { api } from '@/lib/api';
import { downloadBlob } from '@/lib/quoteFormat';
import type { QuoteProposalBlock, QuoteProposalTemplate, QuoteServiceType } from '@/types/quote';
import { ProposalTemplateEditor, type PendingBlockImage } from './ProposalTemplateEditor';
import { ProposalTemplatesList } from './ProposalTemplatesList';

export type QuoteTemplatesSection = 'agencia' | 'propuestas';

type QuoteTemplatesCatalogViewProps = {
  /** When set, only that section is shown (no inner TabBar). Used inside Cotizaciones. */
  section?: QuoteTemplatesSection;
  /** Skip outer page padding when nested in QuotesView. */
  embedded?: boolean;
};

function mapTemplateFromApi(raw: any, fallback: QuoteProposalTemplate): QuoteProposalTemplate {
  if (!raw || !Array.isArray(raw.blocks)) return fallback;
  return {
    ...fallback,
    blocks: raw.blocks.map((b: any) => ({
      id: String(b.id),
      blockType: b.blockType,
      title: String(b.title ?? ''),
      body: String(b.body ?? ''),
      imageUrl: b.imageUrl ?? null,
      sortOrder: Number(b.sortOrder ?? 0),
    })),
  };
}

async function uploadPendingImages(
  token: string,
  template: QuoteProposalTemplate,
  pendingImages: PendingBlockImage[]
): Promise<QuoteProposalTemplate> {
  if (!pendingImages.length) return template;
  let current = template;
  const sortedBlocks = [...current.blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const pending of pendingImages) {
    const block = sortedBlocks[pending.sortOrder] || sortedBlocks.find((b) => b.sortOrder === pending.sortOrder);
    if (!block?.id) continue;
    const raw = await api.uploadQuoteProposalBlockImage(current.id, block.id, pending.file, token);
    current = mapTemplateFromApi(raw, current);
  }
  return current;
}

export function QuoteTemplatesCatalogView({ section, embedded = false }: QuoteTemplatesCatalogViewProps) {
  const { token, can } = useAuth();
  const quotesStore = useQuotesStore();
  const proposalsStore = useQuoteProposalTemplatesStore();
  const [tab, setTab] = useState<QuoteTemplatesSection>(section || 'agencia');
  const [editing, setEditing] = useState<QuoteProposalTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const wasCreating = creating;

  const canCreate = can('quotes.create');
  const canUpdate = can('quotes.update');
  const canDelete = can('quotes.delete');
  const activeSection = section || tab;
  const showSectionTabs = !section;

  useEffect(() => {
    if (section) {
      setTab(section);
      setCreating(false);
      setEditing(null);
    }
  }, [section]);

  useEffect(() => {
    if (!token) return;
    quotesStore.fetchTemplate(token).catch(() => {
      toast.error('No se pudo cargar la plantilla de agencia');
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || activeSection !== 'propuestas') return;
    proposalsStore.fetchTemplates(token, { includeInactive: true }).catch(() => {
      toast.error('No se pudieron cargar las plantillas de propuesta');
    });
  }, [token, activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const proposalPdfFilename = (template: QuoteProposalTemplate) => {
    const safe = template.name.replace(/[^\w\-]+/g, '-').slice(0, 40) || 'propuesta';
    return `propuesta-${safe}.pdf`;
  };

  const handleDownloadProposalPdf = async (template: QuoteProposalTemplate) => {
    if (!token) return;
    try {
      const blob = await api.getQuoteProposalTemplatePdf(template.id, token);
      await downloadBlob(blob, proposalPdfFilename(template));
      toast.success('PDF descargado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el PDF');
    }
  };

  const handleSaveProposal = async (
    draft: {
      name: string;
      description: string;
      serviceType: QuoteServiceType | null;
      blocks: QuoteProposalBlock[];
    },
    pendingImages: PendingBlockImage[]
  ) => {
    if (!token) return;
    setSaving(true);
    try {
      let saved: QuoteProposalTemplate | undefined;
      if (creating) {
        saved = await proposalsStore.createTemplate(token, draft);
      } else if (editing) {
        saved = await proposalsStore.updateTemplate(token, editing.id, draft);
      } else {
        return;
      }

      const withImages = await uploadPendingImages(token, saved, pendingImages);
      setCreating(false);
      setEditing(withImages);
      await proposalsStore.fetchTemplates(token, { includeInactive: true });
      toast.success(
        pendingImages.length
          ? 'Plantilla guardada con fotos'
          : wasCreating
            ? 'Plantilla de propuesta creada'
            : 'Plantilla de propuesta actualizada'
      );
      return withImages;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <>
      {showSectionTabs ? (
        <TabBar
          tabs={[
            { id: 'agencia', label: 'Agencia' },
            { id: 'propuestas', label: 'Propuestas' },
          ]}
          value={tab}
          onChange={(id) => {
            setTab(id as QuoteTemplatesSection);
            setCreating(false);
            setEditing(null);
          }}
        />
      ) : null}

      {activeSection === 'agencia' ? (
        quotesStore.template ? (
          <QuoteTemplateEditor
            template={quotesStore.template}
            canUpdate={canUpdate}
            onSave={async (draft) => {
              if (!token || !canUpdate) return;
              await quotesStore.saveTemplate(token, draft);
              toast.success('Plantilla de agencia actualizada');
            }}
            onDownloadSample={async () => {
              if (!token) return;
              const blob = await api.getQuoteTemplatePdf(token);
              await downloadBlob(blob, 'cotizacion-ejemplo.pdf');
              toast.success('PDF de ejemplo descargado');
            }}
          />
        ) : (
          <Card className="p-5 text-sm text-muted-foreground">Cargando plantilla de agencia…</Card>
        )
      ) : creating || editing ? (
        <ProposalTemplateEditor
          template={creating ? null : editing}
          canSave={canUpdate || (creating && canCreate)}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={handleSaveProposal}
          onDownloadPdf={
            editing
              ? () => {
                  void handleDownloadProposalPdf(editing);
                }
              : undefined
          }
        />
      ) : (
        <ProposalTemplatesList
          templates={proposalsStore.templates}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onCreate={() => {
            setCreating(true);
            setEditing(null);
          }}
          onEdit={(template) => {
            setCreating(false);
            setEditing(template);
          }}
          onDownloadPdf={(template) => {
            void handleDownloadProposalPdf(template);
          }}
          onClone={async (template) => {
            if (!token || !canUpdate) return;
            try {
              const cloned = await proposalsStore.cloneTemplate(token, template.id);
              toast.success(`Duplicada: ${cloned.name}`);
              setEditing(cloned);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'No se pudo duplicar');
            }
          }}
          onDeactivate={async (template) => {
            if (!token || !canDelete) return;
            try {
              await proposalsStore.deactivateTemplate(token, template.id);
              toast.success('Plantilla desactivada');
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'No se pudo desactivar');
            }
          }}
        />
      )}
    </>
  );

  if (embedded) return content;
  return <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{content}</div>;
}
