import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Toolbar } from '@/components/layout/Toolbar';
import { useAuth } from '@/contexts/AuthContext';
import { useClientStore } from '@/hooks/useClientStore';
import { useQuotesStore } from '@/hooks/useQuotesStore';
import { api } from '@/lib/api';
import { downloadBlob, QUOTE_STATUS_LABEL } from '@/lib/quoteFormat';
import type { Quote, QuoteStatus, QuoteWritePayload } from '@/types/quote';
import { toast } from 'sonner';
import { QuoteTable } from './QuoteTable';
import { QuoteFormModal } from './QuoteFormModal';
import { QuoteDetail } from './QuoteDetail';
import { QuoteTemplateEditor } from './QuoteTemplateEditor';

type QuotesViewProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  createOpenSignal?: number;
  openQuoteId?: string | null;
  onOpenQuoteConsumed?: () => void;
};

const STATUS_FILTERS: Array<'all' | QuoteStatus> = ['all', 'draft', 'registered', 'expired'];

export function QuotesView({ search = '', onSearchChange, createOpenSignal = 0, openQuoteId = null, onOpenQuoteConsumed }: QuotesViewProps) {
  const { token, user, can } = useAuth();
  const { pickerClients, fetchClientsForPickers } = useClientStore();
  const store = useQuotesStore();
  const [filter, setFilter] = useState<'all' | QuoteStatus>('all');
  const [tab, setTab] = useState<'list' | 'template'>('list');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastCreateSignal = useRef(createOpenSignal);

  const canCreate = can('quotes.create');
  const canUpdate = can('quotes.update');

  useEffect(() => {
    if (!token) return;
    store.fetchTemplate(token).catch((error) => {
      console.error(error);
    });
    fetchClientsForPickers(token).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    const handle = window.setTimeout(() => {
      store.fetchQuotes(token, { q: search || undefined }).catch((error) => {
        console.error(error);
        toast.error('No se pudieron cargar las cotizaciones');
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [token, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (createOpenSignal === lastCreateSignal.current) return;
    lastCreateSignal.current = createOpenSignal;
    if (!canCreate) return;
    setTab('list');
    setSelectedId(null);
    setEditing(null);
    setCreating(true);
  }, [createOpenSignal, canCreate]);

  useEffect(() => {
    if (!openQuoteId) return;
    setTab('list');
    setCreating(false);
    setEditing(null);
    setSelectedId(openQuoteId);
    if (token) {
      store.fetchQuote(token, openQuoteId).catch(() => {
        toast.error('No se pudo abrir la cotización');
      });
    }
    onOpenQuoteConsumed?.();
  }, [openQuoteId, token, onOpenQuoteConsumed]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => {
    if (filter === 'all') return store.quotes;
    return store.quotes.filter((quote) => quote.status === filter);
  }, [store.quotes, filter]);

  const selected = selectedId ? store.quotes.find((quote) => quote.id === selectedId) ?? null : null;
  const template = store.template;

  const handleCreate = async (data: QuoteWritePayload) => {
    if (!token) return;
    setSubmitting(true);
    try {
      const created = await store.createQuote(token, data);
      setCreating(false);
      setSelectedId(created.id);
      toast.success('Cotización creada y ligada al cliente');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la cotización');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: QuoteWritePayload) => {
    if (!token || !editing) return;
    setSubmitting(true);
    try {
      await store.updateQuote(token, editing.id, data);
      setEditing(null);
      toast.success('Cotización actualizada');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la cotización');
    } finally {
      setSubmitting(false);
    }
  };

  if (selected && template) {
    return (
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <QuoteDetail
          quote={selected}
          template={template}
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
          clients={pickerClients}
          advisorName={user?.name || ''}
          template={template}
          quote={editing}
          submitting={submitting}
          onSubmit={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap gap-2">
        <Button type="button" variant={tab === 'list' ? 'default' : 'outline'} onClick={() => setTab('list')}>
          <ClipboardList />
          Cotizaciones
        </Button>
        <Button type="button" variant={tab === 'template' ? 'default' : 'outline'} onClick={() => setTab('template')}>
          <FileText />
          Plantilla PDF
        </Button>
      </div>

      {tab === 'template' && template ? (
        <QuoteTemplateEditor
          template={template}
          canUpdate={canUpdate}
          onSave={async (draft) => {
            if (!token || !canUpdate) return;
            await store.saveTemplate(token, draft);
            toast.success('Plantilla de cotización actualizada');
          }}
          onDownloadSample={async () => {
            const blob = await api.getQuoteTemplatePdf(token);
            await downloadBlob(blob, 'cotizacion-ejemplo.pdf');
            toast.success('PDF de ejemplo descargado');
          }}
        />
      ) : tab === 'template' ? (
        <Card className="p-5 text-sm text-muted-foreground">Cargando plantilla…</Card>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <QuoteStat
              label="Cotizaciones activas"
              value={String(store.quotes.filter((q) => q.status !== 'expired').length)}
              hint="En seguimiento"
            />
            <QuoteStat
              label="Borradores"
              value={String(store.quotes.filter((q) => q.status === 'draft').length)}
              hint="Por completar"
            />
            <QuoteStat
              label="Registradas"
              value={String(store.quotes.filter((q) => q.status === 'registered').length)}
              hint="Ligadas a un cliente"
            />
            <QuoteStat
              label="Por vencer o vencidas"
              value={String(store.quotes.filter((q) => q.status === 'expired').length)}
              hint="Requieren nueva tarifa"
            />
          </div>
          <Toolbar search={search} onSearchChange={onSearchChange} placeholder="Buscar por folio, cliente o propuesta…">
            {canCreate ? (
              <Button type="button" onClick={() => setCreating(true)}>
                <Plus />
                Nueva cotización
              </Button>
            ) : null}
          </Toolbar>
          <div className="mb-4 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={filter === item ? 'default' : 'outline'}
                onClick={() => setFilter(item)}
              >
                {item === 'all' ? 'Todas' : QUOTE_STATUS_LABEL[item]}
              </Button>
            ))}
          </div>
          <QuoteFormModal
            open={creating}
            onOpenChange={setCreating}
            clients={pickerClients}
            advisorName={user?.name || ''}
            template={template}
            submitting={submitting}
            onSubmit={handleCreate}
          />
          {list.length === 0 ? (
            <Card className="p-5 text-center">
              <ClipboardList className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-display font-semibold">Sin cotizaciones en este filtro</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crea una nueva propuesta para ligarla al expediente de un cliente.
              </p>
            </Card>
          ) : (
            <QuoteTable list={list} onDetail={setSelectedId} />
          )}
        </>
      )}
    </div>
  );
}

function QuoteStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
