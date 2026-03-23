import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_TYPE_LABELS, type PaymentType } from '@/types/form';
import { toast } from 'sonner';

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
}

export const PaymentLogsPage = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      const rows: PaymentRow[] = (data || []).map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.payment_date || p.paymentDate,
        paymentType: p.payment_type || p.paymentType || 'efectivo',
        referenceNumber: p.reference_number || p.referenceNumber,
        note: p.note,
        clientId: p.clientId || p.client_id,
        clientName: p.client?.name || '—',
        createdAt: p.created_at || p.createdAt,
      }));
      setPayments(rows);
    } catch (error: unknown) {
      console.error('Error loading payment logs:', error);
      toast.error('Error al cargar los logs de pagos');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Logs de pagos
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({payments.length} registros · Total: {totalAmount.toFixed(2)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay pagos registrados</p>
            <p className="text-xs">Los pagos aparecerán aquí cuando se registren en el perfil de cada cliente</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ticket/Transferencia</TableHead>
                  <TableHead className="max-w-[200px]">Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(p.paymentDate), "d MMM yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {p.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted/60 px-2 py-0.5 rounded">
                        {PAYMENT_TYPE_LABELS[(p.paymentType as PaymentType) || 'efectivo']}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {p.referenceNumber || '—'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {p.note || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
