import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_TYPE_LABELS, type PaymentType } from '@/types/form';
import { PaymentReceiptActions } from '@/components/payments/PaymentReceiptActions';
import { Toolbar } from '@/components/layout/Toolbar';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { toast } from 'sonner';

const formatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

interface PaymentRow {
  id: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  referenceNumber?: string;
  note?: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  packageTitle?: string | null;
  hasReceipt: boolean;
}

export const PaymentLogsPage = () => {
  const { token, can } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canManageReceipt = can('client_payments.update') || can('payment_logs.view');
  const canViewReceipt = can('payment_logs.view') || can('client_payments.view');

  useEffect(() => {
    if (token) {
      loadPayments();
    }
  }, [token]);

  const loadPayments = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.getCompanyPayments(token);
      const rows: PaymentRow[] = (data || []).map((p: Record<string, unknown>) => {
        const ap = (p.acquired_package ?? p.acquiredPackage) as
          | { product?: { title?: string } }
          | undefined;
        const client = p.client as { name?: string } | undefined;
        const pkgTitle = ap?.product?.title ?? null;
        return {
          id: String(p.id),
          amount: Number(p.amount),
          paymentDate: String(p.payment_date || p.paymentDate || ''),
          paymentType: String(p.payment_type || p.paymentType || 'efectivo'),
          referenceNumber: (p.reference_number || p.referenceNumber) as string | undefined,
          note: p.note as string | undefined,
          clientId: String(p.clientId || p.client_id || ''),
          clientName: client?.name || '—',
          createdAt: String(p.created_at || p.createdAt || ''),
          packageTitle: pkgTitle,
          hasReceipt: Boolean(p.hasReceipt ?? p.has_receipt),
        };
      });
      setPayments(rows);
    } catch (error: unknown) {
      console.error('Error loading payment logs:', error);
      toast.error('Error al cargar los logs de pagos');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const typeLabel = PAYMENT_TYPE_LABELS[(p.paymentType as PaymentType) || 'efectivo'] ?? '';
      return (
        p.clientName.toLowerCase().includes(q) ||
        (p.referenceNumber ?? '').toLowerCase().includes(q) ||
        (p.packageTitle ?? '').toLowerCase().includes(q) ||
        (p.note ?? '').toLowerCase().includes(q) ||
        typeLabel.toLowerCase().includes(q)
      );
    });
  }, [payments, search]);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <Card className="overflow-x-auto p-5">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar referencia, cliente o paquete…"
        />

        {payments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <DollarSign className="mx-auto mb-3 size-12 opacity-40" />
            <p className="font-display text-lg font-semibold text-foreground">No hay pagos registrados</p>
            <p className="mt-1 text-sm">
              Los pagos aparecerán aquí cuando se registren en el perfil de cada cliente
            </p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay movimientos que coincidan con la búsqueda.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              {filteredPayments.length} registro{filteredPayments.length !== 1 ? 's' : ''} · Total{' '}
              {formatter.format(totalAmount)}
            </p>
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-3 py-3 font-medium">Fecha</th>
                  <th className="px-3 py-3 font-medium">Referencia</th>
                  <th className="px-3 py-3 font-medium">Cliente</th>
                  <th className="px-3 py-3 font-medium">Paquete</th>
                  <th className="px-3 py-3 font-medium">Tipo</th>
                  <th className="px-3 py-3 text-right font-medium">Monto</th>
                  <th className="px-3 py-3 font-medium">Recibo</th>
                  <th className="px-3 py-3 text-center font-medium">Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="whitespace-nowrap px-3 py-4">
                      {p.paymentDate
                        ? format(new Date(p.paymentDate), 'd MMM yyyy', { locale: es })
                        : '—'}
                    </td>
                    <td className="px-3 font-mono text-xs">{p.referenceNumber || '—'}</td>
                    <td className="px-3 font-medium">{p.clientName}</td>
                    <td className="max-w-[200px] truncate px-3">
                      <span>{p.packageTitle || '—'}</span>
                      {p.note ? (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{p.note}</span>
                      ) : null}
                    </td>
                    <td className="px-3">
                      <StatusBadge tone="accent">
                        {PAYMENT_TYPE_LABELS[(p.paymentType as PaymentType) || 'efectivo']}
                      </StatusBadge>
                    </td>
                    <td className="px-3 text-right font-semibold">{formatter.format(p.amount)}</td>
                    <td className="px-3">
                      <StatusBadge tone={p.hasReceipt ? 'success' : 'warning'}>
                        {p.hasReceipt ? 'Con recibo' : 'Sin recibo'}
                      </StatusBadge>
                    </td>
                    <td className="px-3">
                      <PaymentReceiptActions
                        paymentId={p.id}
                        hasReceipt={p.hasReceipt}
                        canManage={canManageReceipt}
                        canView={canViewReceipt}
                        dialogSubtitle={p.clientName}
                        onHasReceiptChange={(hasReceipt) =>
                          setPayments((prev) =>
                            prev.map((row) => (row.id === p.id ? { ...row, hasReceipt } : row))
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
};
