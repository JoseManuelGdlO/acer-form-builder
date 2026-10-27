import { Copy, Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { QUOTE_TYPE_LABEL } from '@/lib/quoteFormat';
import type { QuoteProposalTemplate } from '@/types/quote';

type ProposalTemplatesListProps = {
  templates: QuoteProposalTemplate[];
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onCreate: () => void;
  onEdit: (template: QuoteProposalTemplate) => void;
  onClone: (template: QuoteProposalTemplate) => void;
  onDeactivate: (template: QuoteProposalTemplate) => void;
  onDownloadPdf?: (template: QuoteProposalTemplate) => void;
};

export function ProposalTemplatesList({
  templates,
  canCreate = false,
  canUpdate = false,
  canDelete = false,
  onCreate,
  onEdit,
  onClone,
  onDeactivate,
  onDownloadPdf,
}: ProposalTemplatesListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate ? (
          <Button type="button" onClick={onCreate}>
            <Plus />
            Nueva propuesta
          </Button>
        ) : null}
      </div>
      {templates.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          No hay plantillas de propuesta. Clona una del sistema o crea una nueva.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold">{template.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.description || 'Sin descripción'}
                  </p>
                </div>
                <StatusBadge tone={template.isSystem ? 'accent' : template.isActive ? 'success' : 'neutral'}>
                  {!template.isActive ? 'Inactiva' : template.isSystem ? 'Sistema' : 'Empresa'}
                </StatusBadge>
              </div>
              <p className="text-xs text-muted-foreground">
                {template.serviceType ? QUOTE_TYPE_LABEL[template.serviceType] : 'Sin tipo'} ·{' '}
                {template.blocks.length} bloque{template.blocks.length === 1 ? '' : 's'}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                {onDownloadPdf ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onDownloadPdf(template)}>
                    <Download />
                    Descargar PDF
                  </Button>
                ) : null}
                {canUpdate && !template.isSystem ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onEdit(template)}>
                    <Pencil />
                    Editar
                  </Button>
                ) : null}
                {canUpdate ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => onClone(template)}>
                    <Copy />
                    Duplicar
                  </Button>
                ) : null}
                {canDelete && !template.isSystem && template.isActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onDeactivate(template)}
                  >
                    <Trash2 />
                    Desactivar
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
