import { useState } from 'react';
import { Check, CheckCircle2, Clock3, Download, Pencil, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { api } from '@/lib/api';
import {
  downloadBlob,
  formatQuoteDate,
  formatQuoteMoney,
  QUOTE_ORIGIN_LABEL,
  QUOTE_STATUS_LABEL,
  QUOTE_TYPE_LABEL,
  quoteTone,
} from '@/lib/quoteFormat';
import type { Quote, QuoteTemplate } from '@/types/quote';
import { QuotePdfPreview } from './QuotePdfPreview';
import { toast } from 'sonner';

type QuoteDetailProps = {
  quote: Quote;
  template: QuoteTemplate;
  canUpdate?: boolean;
  onBack: () => void;
  onEdit?: () => void;
  onStatusChange?: (status: Quote['status']) => Promise<void>;
  onAddTrack?: () => Promise<void>;
};

export function QuoteDetail({
  quote,
  template,
  canUpdate = false,
  onBack,
  onEdit,
  onStatusChange,
  onAddTrack,
}: QuoteDetailProps) {
  const [busy, setBusy] = useState(false);
  const includes = quote.includes.length ? quote.includes : template.includes.split('\n').filter(Boolean);
  const excludes = quote.excludes.length ? quote.excludes : template.excludes.split('\n').filter(Boolean);

  const downloadPdf = async () => {
    try {
      const blob = await api.getQuotePdf(quote.id);
      await downloadBlob(blob, `${quote.folio}.pdf`);
      toast.success('PDF descargado');
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF');
    }
  };

  const run = async (fn?: () => Promise<void>) => {
    if (!fn) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" onClick={onBack}>
        ← Volver a cotizaciones
      </Button>
      <Card className="mt-4 p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Folio {quote.folio} · {QUOTE_ORIGIN_LABEL[quote.origin]}
            </p>
            <h2 className="font-display text-2xl font-semibold">{quote.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cliente {quote.clientName} · Agente {quote.advisorName} · Vigencia {formatQuoteDate(quote.validUntil)}
            </p>
          </div>
          <StatusBadge tone={quoteTone(quote.status)}>{QUOTE_STATUS_LABEL[quote.status]}</StatusBadge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void downloadPdf()}>
              <Download />
              Descargar PDF
            </Button>
            {canUpdate && onEdit ? (
              <Button type="button" variant="outline" onClick={onEdit}>
                <Pencil />
                Editar
              </Button>
            ) : null}
            {canUpdate && onStatusChange ? (
              quote.status === 'draft' ? (
                <Button type="button" disabled={busy} onClick={() => void run(() => onStatusChange('registered'))}>
                  <CheckCircle2 />
                  Marcar registrada
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(() => onStatusChange('draft'))}
                >
                  <Save />
                  Regresar a borrador
                </Button>
              )
            ) : null}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ['Costo total', formatQuoteMoney(quote.totalAmount, quote.currency)],
              ['Anticipo', formatQuoteMoney(quote.advanceAmount, quote.currency)],
              ['Tipo', QUOTE_TYPE_LABEL[quote.type]],
              ['Inicio', formatQuoteDate(quote.startDate)],
              ['Fin', formatQuoteDate(quote.endDate)],
            ] as Array<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="rounded-md bg-muted p-3">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle title="Detalles de hospedaje" />
            <p className="font-display font-semibold">{quote.hotel || 'Por capturar'}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {(
                [
                  ['Check-in', formatQuoteDate(quote.startDate)],
                  ['Estancia', QUOTE_TYPE_LABEL[quote.type]],
                  ['Check-out', formatQuoteDate(quote.endDate)],
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="rounded-md bg-muted p-3 text-center">
                  <p className="text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Incluye y no incluye" />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Incluye</p>
                {includes.map((item) => (
                  <p key={item} className="mt-2 flex gap-2 text-sm">
                    <Check className="size-4 text-success" />
                    {item}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">No incluye</p>
                {excludes.map((item) => (
                  <p key={item} className="mt-2 flex gap-2 text-sm">
                    <X className="size-4 text-muted-foreground" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Notas y condiciones" />
            <p className="whitespace-pre-line text-sm text-muted-foreground">{quote.notes || 'Sin notas específicas.'}</p>
            <p className="mt-3 whitespace-pre-line text-xs text-muted-foreground">{quote.terms || template.terms}</p>
          </Card>
          <Card className="p-5">
            <SectionTitle title="Vista previa del PDF" />
            <QuotePdfPreview quote={quote} template={template} />
            <p className="mt-3 text-xs text-muted-foreground">
              El diseño proviene de la plantilla editable en Cotizaciones → Plantilla PDF.
            </p>
          </Card>
        </div>
        <Card className="p-5">
          <SectionTitle title="Seguimiento" />
          {quote.track.map((event, index) => (
            <div key={`${event.label}-${index}`} className="mb-4 flex gap-3">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm">{event.label}</p>
                <p className="text-xs text-muted-foreground">{event.date}</p>
              </div>
            </div>
          ))}
          {canUpdate && onAddTrack ? (
            <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void run(onAddTrack)}>
              <Clock3 />
              Agregar nota de seguimiento
            </Button>
          ) : null}
        </Card>
      </div>
    </>
  );
}
