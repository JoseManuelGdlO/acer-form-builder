import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type {
  Quote,
  QuoteProposalTemplate,
  QuoteServiceType,
  QuoteTemplate,
  QuoteWritePayload,
} from '@/types/quote';
import { linesToText, QUOTE_SERVICE_TYPES, QUOTE_TYPE_LABEL, textToLines } from '@/lib/quoteFormat';

type QuoteFormProps = {
  clients: Array<{ id: string; name: string }>;
  lockedClientId?: string;
  advisorName: string;
  template: QuoteTemplate | null;
  proposalTemplates: QuoteProposalTemplate[];
  quote?: Quote | null;
  submitting?: boolean;
  onSubmit: (data: QuoteWritePayload) => Promise<void>;
  onCancel: () => void;
};

type FormState = {
  clientId: string;
  proposalTemplateId: string;
  title: string;
  type: QuoteServiceType;
  advisorName: string;
  totalAmount: string;
  advanceAmount: string;
  startDate: string;
  endDate: string;
  validUntil: string;
  hotel: string;
  notes: string;
  includes: string;
  excludes: string;
  terms: string;
};

function toForm(
  quote: Quote | null | undefined,
  defaults: {
    clientId: string;
    advisorName: string;
    template: QuoteTemplate | null;
    proposalTemplateId: string;
  }
): FormState {
  return {
    clientId: quote?.clientId || defaults.clientId,
    proposalTemplateId: quote?.proposalTemplateId || defaults.proposalTemplateId,
    title: quote?.title || '',
    type: quote?.type || 'lodging',
    advisorName: quote?.advisorName || defaults.advisorName,
    totalAmount: quote?.totalAmount != null ? String(quote.totalAmount) : '',
    advanceAmount: quote?.advanceAmount != null ? String(quote.advanceAmount) : '',
    startDate: quote?.startDate?.slice(0, 10) || '',
    endDate: quote?.endDate?.slice(0, 10) || '',
    validUntil: quote?.validUntil?.slice(0, 10) || '',
    hotel: quote?.hotel || '',
    notes: quote?.notes || '',
    includes: quote ? linesToText(quote.includes) : defaults.template?.includes || '',
    excludes: quote ? linesToText(quote.excludes) : defaults.template?.excludes || '',
    terms: quote?.terms || defaults.template?.terms || '',
  };
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function QuoteForm({
  clients,
  lockedClientId,
  advisorName,
  template,
  proposalTemplates,
  quote,
  submitting = false,
  onSubmit,
  onCancel,
}: QuoteFormProps) {
  const defaultClientId = lockedClientId || clients[0]?.id || '';
  const defaultProposalId = quote?.proposalTemplateId || proposalTemplates[0]?.id || '';
  const [form, setForm] = useState<FormState>(() =>
    toForm(quote, {
      clientId: defaultClientId,
      advisorName,
      template,
      proposalTemplateId: defaultProposalId,
    })
  );

  useEffect(() => {
    setForm(
      toForm(quote, {
        clientId: lockedClientId || clients[0]?.id || '',
        advisorName,
        template,
        proposalTemplateId: quote?.proposalTemplateId || proposalTemplates[0]?.id || '',
      })
    );
  }, [quote, lockedClientId, clients, advisorName, template, proposalTemplates]);

  const set = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    if (!form.clientId || !form.proposalTemplateId) return;
    await onSubmit({
      clientId: form.clientId,
      proposalTemplateId: form.proposalTemplateId,
      title: form.title.trim() || 'Nueva propuesta',
      type: form.type,
      hotel: form.hotel.trim() || null,
      advisorName: form.advisorName.trim() || advisorName,
      totalAmount: parseAmount(form.totalAmount),
      advanceAmount: parseAmount(form.advanceAmount),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      validUntil: form.validUntil || null,
      notes: form.notes.trim() || null,
      includes: textToLines(form.includes),
      excludes: textToLines(form.excludes),
      terms: form.terms,
    });
  };

  const field = (key: keyof FormState, label: string, placeholder?: string, type = 'text') => (
    <div key={key}>
      <Label className="mb-2 block text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const lockedClient = clients.find((c) => c.id === lockedClientId);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        Todo lo que captures aquí es exactamente lo que verás en el detalle y en el PDF.
      </p>

      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        1 · Cliente, plantilla y servicio
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs font-medium">Cliente</Label>
          <select
            disabled={Boolean(lockedClientId)}
            value={form.clientId}
            onChange={(e) => set('clientId', e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70"
          >
            <option value="">Selecciona un cliente…</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {lockedClient ? (
            <span className="mt-1 block text-[10px] text-muted-foreground">
              Ligada al expediente de {lockedClient.name}
            </span>
          ) : null}
        </div>
        <div>
          <Label className="mb-2 block text-xs font-medium">Plantilla de propuesta</Label>
          <select
            value={form.proposalTemplateId}
            onChange={(e) => {
              const id = e.target.value;
              set('proposalTemplateId', id);
              const selected = proposalTemplates.find((item) => item.id === id);
              if (selected?.serviceType) set('type', selected.serviceType);
            }}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecciona una plantilla…</option>
            {proposalTemplates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.isSystem ? ' (sistema)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-2 block text-xs font-medium">Tipo de servicio</Label>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as QuoteServiceType)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {QUOTE_SERVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUOTE_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        {field('title', 'Título de la propuesta', 'Moon Palace · 13 habitaciones')}
        {field('hotel', 'Hotel o destino', 'Moon Palace The Grand · Cancún')}
        {field('advisorName', 'Agente que cotiza')}
      </div>

      <p className="mb-3 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        2 · Fechas e importes
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {field('startDate', 'Inicio', undefined, 'date')}
        {field('endDate', 'Fin', undefined, 'date')}
        {field('totalAmount', 'Costo total', '38758.68')}
        {field('advanceAmount', 'Anticipo requerido', '3000')}
        {field('validUntil', 'Vigencia hasta', undefined, 'date')}
      </div>

      <p className="mb-3 mt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        3 · Incluye, no incluye y condiciones
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="mb-2 block text-xs font-medium">Incluye (una por línea)</Label>
          <Textarea value={form.includes} onChange={(e) => set('includes', e.target.value)} className="min-h-28" />
        </div>
        <div>
          <Label className="mb-2 block text-xs font-medium">No incluye (una por línea)</Label>
          <Textarea value={form.excludes} onChange={(e) => set('excludes', e.target.value)} className="min-h-28" />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-medium">Condiciones</Label>
          <Textarea value={form.terms} onChange={(e) => set('terms', e.target.value)} className="min-h-24" />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 block text-xs font-medium">Notas específicas</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className="min-h-24"
            placeholder="Acomodo de habitaciones, fechas límite de pago…"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Los textos de incluye, no incluye y condiciones vienen precargados de Cotizaciones → Agencia; la propuesta con
        fotos se toma de Cotizaciones → Propuestas.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => void save()}
          disabled={submitting || !form.clientId || !form.proposalTemplateId}
        >
          <Save />
          Guardar cotización
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
