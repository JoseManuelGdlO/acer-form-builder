import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotesStore } from '@/hooks/useQuotesStore';
import { api } from '@/lib/api';
import { formatQuoteDate, formatQuoteMoney, QUOTE_STATUS_LABEL, quoteTone } from '@/lib/quoteFormat';
import type { Quote, QuoteWritePayload } from '@/types/quote';
import { toast } from 'sonner';
import { QuoteFormModal } from './QuoteFormModal';
import { QuoteDetail } from './QuoteDetail';

type ClientQuotesProps = {
  clientId: string;
  clientName: string;
};

function mapLite(raw: Record<string, unknown>): Quote {
  return {
    id: String(raw.id),
    companyId: String(raw.companyId ?? ''),
    clientId: String(raw.clientId ?? ''),
    clientName: String(raw.clientName ?? ''),
    folio: String(raw.folio ?? ''),
    title: String(raw.title ?? ''),
    type: (raw.type as Quote['type']) ?? 'lodging',
    hotel: String(raw.hotel ?? ''),
    advisorName: String(raw.advisorName ?? ''),
    advisorUserId: (raw.advisorUserId as string | null) ?? null,
    totalAmount: raw.totalAmount != null ? Number(raw.totalAmount) : null,
    advanceAmount: raw.advanceAmount != null ? Number(raw.advanceAmount) : null,
    currency: String(raw.currency || 'MXN'),
    startDate: (raw.startDate as string | null) ?? null,
    endDate: (raw.endDate as string | null) ?? null,
    validUntil: (raw.validUntil as string | null) ?? null,
    status: (raw.status as Quote['status']) ?? 'draft',
    origin: (raw.origin as Quote['origin']) ?? 'system',
    notes: String(raw.notes ?? ''),
    includes: Array.isArray(raw.includes) ? (raw.includes as string[]) : [],
    excludes: Array.isArray(raw.excludes) ? (raw.excludes as string[]) : [],
    terms: String(raw.terms ?? ''),
    track: Array.isArray(raw.track) ? (raw.track as Quote['track']) : [],
  };
}

export function ClientQuotes({ clientId, clientName }: ClientQuotesProps) {
  const { token, user, can } = useAuth();
  const store = useQuotesStore();
  const [creating, setCreating] = useState(false);
  const [pick, setPick] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);

  const canCreate = can('quotes.create');
  const canUpdate = can('quotes.update');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      await store.fetchQuotes(token, { clientId });
      const every = await api.getQuotes(undefined, token);
      setAllQuotes(Array.isArray(every) ? every.map((row) => mapLite(row as Record<string, unknown>)) : []);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las cotizaciones del cliente');
    }
  }, [token, clientId, store]);

  useEffect(() => {
    if (!token || !can('quotes.view')) return;
    void load();
    store.fetchTemplate(token).catch(() => {});
  }, [token, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const own = useMemo(
    () => store.quotes.filter((quote) => quote.clientId === clientId),
    [store.quotes, clientId]
  );
  const others = useMemo(
    () => allQuotes.filter((quote) => quote.clientId !== clientId),
    [allQuotes, clientId]
  );
  const selected = selectedId
    ? own.find((quote) => quote.id === selectedId) ?? store.quotes.find((quote) => quote.id === selectedId) ?? null
    : null;

  const handleCreate = async (data: QuoteWritePayload) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const created = await store.createQuote(token, { ...data, clientId });
      setCreating(false);
      setSelectedId(created.id);
      toast.success('Cotización creada y ligada al cliente');
      await load();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la cotización');
    } finally {
      setSubmitting(false);
    }
  };

  if (selected && store.template) {
    return (
      <>
        <QuoteDetail
          quote={selected}
          template={store.template}
          canUpdate={canUpdate}
          onBack={() => setSelectedId(null)}
          onEdit={() => setEditing(selected)}
          onStatusChange={async (status) => {
            if (!token) return;
            await store.updateStatus(token, selected.id, status);
            toast.success(status === 'registered' ? 'Cotización registrada' : 'Cotización en borrador');
          }}
          onAddTrack={async () => {
            if (!token) return;
            await store.addEvent(token, selected.id);
            toast.success('Nota de seguimiento agregada');
          }}
        />
        <QuoteFormModal
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          clients={[{ id: clientId, name: clientName }]}
          lockedClientId={clientId}
          advisorName={user?.name || ''}
          template={store.template}
          quote={editing}
          submitting={submitting}
          onSubmit={async (data) => {
            if (!token || !editing) return;
            setSubmitting(true);
            try {
              await store.updateQuote(token, editing.id, data);
              setEditing(null);
              toast.success('Cotización actualizada');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Cotizaciones ligadas a {clientName}: {own.length}
        </p>
        {canCreate ? (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus />
            Crear cotización
          </Button>
        ) : null}
      </div>
      <QuoteFormModal
        open={creating}
        onOpenChange={setCreating}
        clients={[{ id: clientId, name: clientName }]}
        lockedClientId={clientId}
        advisorName={user?.name || ''}
        template={store.template}
        submitting={submitting}
        onSubmit={handleCreate}
      />
      {own.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Este cliente aún no tiene cotizaciones. Crea una nueva o liga una de las que ya existen.
        </div>
      ) : (
        own.map((quote) => (
          <button
            key={quote.id}
            type="button"
            onClick={() => setSelectedId(quote.id)}
            className="flex w-full items-center gap-3 rounded-md bg-muted p-3 text-left"
          >
            <ClipboardList className="size-4 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{quote.title}</p>
              <p className="text-xs text-muted-foreground">
                Folio {quote.folio} · {formatQuoteMoney(quote.totalAmount, quote.currency)} · vence{' '}
                {formatQuoteDate(quote.validUntil)}
              </p>
            </div>
            <StatusBadge tone={quoteTone(quote.status)}>{QUOTE_STATUS_LABEL[quote.status]}</StatusBadge>
          </button>
        ))
      )}
      {canUpdate ? (
        <div className="rounded-md border border-border p-4">
          <p className="text-xs font-semibold">Ligar una cotización existente</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="mb-2 block text-xs text-muted-foreground">Elige de la lista de cotizaciones</span>
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Selecciona una cotización…</option>
                {others.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.folio} · {quote.title} · {formatQuoteMoney(quote.totalAmount, quote.currency)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              disabled={!pick}
              onClick={async () => {
                if (!token || !pick) return;
                try {
                  await store.linkQuote(token, pick, clientId);
                  toast.success(`Cotización ligada a ${clientName}`);
                  setPick('');
                  await load();
                } catch (error) {
                  console.error(error);
                  toast.error('No se pudo ligar la cotización');
                }
              }}
            >
              <Link2 />
              Ligar al cliente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
