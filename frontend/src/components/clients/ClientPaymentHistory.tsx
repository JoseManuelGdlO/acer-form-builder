import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  X,
  Check,
  Pencil,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type {
  ClientPayment,
  PaymentType,
  AmountDueLogEntry,
  PaymentDeletedLogEntry,
  ClientAcquiredPackage,
} from '@/types/form';
import { PAYMENT_TYPE_LABELS } from '@/types/form';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import type { Product } from '@/types/product';
import { toast } from 'sonner';

interface FamilyMemberOption {
  id: string;
  name: string;
}

interface ClientPaymentHistoryProps {
  clientId: string;
  totalAmountDue: number | null | undefined;
  onUpdateTotalAmountDue: (value: number | null) => void;
  payments: ClientPayment[];
  amountDueHistory?: AmountDueLogEntry[];
  paymentDeletedHistory?: PaymentDeletedLogEntry[];
  onAddPayment: (data: {
    amount: number;
    paymentDate: string;
    paymentType: PaymentType;
    referenceNumber?: string;
    note?: string;
    acquiredPackageId?: string | null;
  }) => void;
  onDeletePayment?: (paymentId: string) => void;
  /** Familiares del titular (opcional) para asignar paquete a un dependiente */
  familyMembers?: FamilyMemberOption[];
}

export const ClientPaymentHistory = ({
  clientId,
  totalAmountDue,
  onUpdateTotalAmountDue,
  payments,
  amountDueHistory = [],
  paymentDeletedHistory = [],
  onAddPayment,
  onDeletePayment,
  familyMembers = [],
}: ClientPaymentHistoryProps) => {
  const { can, token } = useAuth();
  const canViewAuditLogs = can('client_audit_logs.view');
  const canEditTotalAmountDue = can('client_financials.update');
  const [acquiredPackages, setAcquiredPackages] = useState<ClientAcquiredPackage[]>([]);
  const [productChoices, setProductChoices] = useState<Product[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [newPackageProductId, setNewPackageProductId] = useState<string>('');
  const [newPackageBeneficiaryId, setNewPackageBeneficiaryId] = useState<string>('none');
  const [paymentPackageId, setPaymentPackageId] = useState<string>('__none__');
  const [isAdding, setIsAdding] = useState(false);
  const [deletedHistoryOpen, setDeletedHistoryOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentType, setPaymentType] = useState<PaymentType>('efectivo');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [note, setNote] = useState('');
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editTotalValue, setEditTotalValue] = useState(
    totalAmountDue != null ? String(totalAmountDue) : ''
  );

  const loadPackagesAndProducts = useCallback(async () => {
    if (!token) return;
    setPackagesLoading(true);
    try {
      const [pkgs, byCat, all] = await Promise.all([
        api.getClientAcquiredPackages(clientId, token).catch(() => []),
        api.getProductsByCategories(['PAQUETE'], token).catch(() => []),
        api.getProducts(token).catch(() => []),
      ]);
      const list: ClientAcquiredPackage[] = (pkgs || []).map((row: any) => ({
        id: row.id,
        productId: row.productId ?? row.product_id,
        product: row.product ? { id: row.product.id, title: row.product.title } : null,
        beneficiaryClientId: row.beneficiaryClientId ?? row.beneficiary_client_id ?? null,
        beneficiary: row.beneficiary ? { id: row.beneficiary.id, name: row.beneficiary.name } : null,
        createdAt: new Date(row.createdAt ?? row.created_at),
        updatedAt: row.updatedAt ? new Date(row.updatedAt) : undefined,
      }));
      setAcquiredPackages(list);
      const catalog = Array.isArray(byCat) && byCat.length > 0 ? byCat : all;
      setProductChoices(
        (Array.isArray(catalog) ? catalog : []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          includes: p.includes,
          categories: p.categories,
          price: Number(p.price),
          createdAt: new Date(p.created_at || p.createdAt),
          updatedAt: new Date(p.updated_at || p.updatedAt),
        }))
      );
    } finally {
      setPackagesLoading(false);
    }
  }, [clientId, token]);

  useEffect(() => {
    loadPackagesAndProducts();
  }, [loadPackagesAndProducts]);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDue = totalAmountDue != null ? Number(totalAmountDue) : null;
  const pending = totalDue != null ? Math.max(0, totalDue - totalPaid) : null;

  const handleSubmitPayment = () => {
    const numAmount = parseFloat(amount);
    if (Number.isNaN(numAmount) || numAmount <= 0 || !paymentDate.trim()) return;
    const ref = referenceNumber.trim();
    if (!ref) {
      toast.error('Indica el número de ticket o transferencia');
      return;
    }
    onAddPayment({
      amount: numAmount,
      paymentDate: paymentDate.trim(),
      paymentType,
      referenceNumber: ref,
      note: note.trim() || undefined,
      acquiredPackageId: paymentPackageId !== '__none__' ? paymentPackageId : undefined,
    });
    setAmount('');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setPaymentType('efectivo');
    setReferenceNumber('');
    setNote('');
    setPaymentPackageId('__none__');
    setIsAdding(false);
  };

  const handleAddAcquiredPackage = async () => {
    if (!token || !newPackageProductId) return;
    try {
      await api.createClientAcquiredPackage(
        clientId,
        {
          productId: newPackageProductId,
          beneficiaryClientId: newPackageBeneficiaryId === 'none' ? null : newPackageBeneficiaryId,
        },
        token
      );
      setNewPackageProductId('');
      setNewPackageBeneficiaryId('none');
      setIsAddingPackage(false);
      await loadPackagesAndProducts();
      toast.success('Paquete registrado');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo registrar el paquete';
      toast.error(msg);
    }
  };

  const handleDeleteAcquiredPackage = async (packageId: string) => {
    if (!token) return;
    try {
      await api.deleteClientAcquiredPackage(clientId, packageId, token);
      await loadPackagesAndProducts();
      toast.success('Paquete eliminado de la lista');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar el paquete';
      toast.error(msg);
    }
  };

  const handleSaveTotal = () => {
    const trimmed = editTotalValue.trim();
    if (trimmed === '') {
      onUpdateTotalAmountDue(null);
    } else {
      const num = parseFloat(trimmed);
      if (!Number.isNaN(num) && num >= 0) {
        onUpdateTotalAmountDue(num);
      }
    }
    setIsEditingTotal(false);
    setEditTotalValue(totalAmountDue != null ? String(totalAmountDue) : '');
  };

  const handleCancelEditTotal = () => {
    setIsEditingTotal(false);
    setEditTotalValue(totalAmountDue != null ? String(totalAmountDue) : '');
  };

  /** Orden cronológico (más reciente primero): pagos, cambios de total (admin) y altas de paquete. */
  const timelineItems = useMemo(() => {
    type Item =
      | { kind: 'payment'; id: string; sortAt: number; payment: ClientPayment }
      | { kind: 'amount_due'; id: string; sortAt: number; entry: AmountDueLogEntry }
      | { kind: 'package'; id: string; sortAt: number; pkg: ClientAcquiredPackage };
    const items: Item[] = [];
    for (const p of payments) {
      items.push({
        kind: 'payment',
        id: `pay-${p.id}`,
        sortAt: new Date(p.createdAt).getTime(),
        payment: p,
      });
    }
    if (canViewAuditLogs) {
      for (const e of amountDueHistory) {
        items.push({
          kind: 'amount_due',
          id: `due-${e.id}`,
          sortAt: new Date(e.createdAt).getTime(),
          entry: e,
        });
      }
    }
    for (const pkg of acquiredPackages) {
      items.push({
        kind: 'package',
        id: `pkg-${pkg.id}`,
        sortAt: new Date(pkg.createdAt).getTime(),
        pkg,
      });
    }
    items.sort((a, b) => b.sortAt - a.sortAt);
    return items;
  }, [payments, amountDueHistory, acquiredPackages, canViewAuditLogs]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Historial de pagos
          </CardTitle>
          {!isAdding && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="gap-1.5 text-primary hover:text-primary"
            >
              <Plus className="w-4 h-4" />
              Registrar pago
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total a pagar</p>
            {canEditTotalAmountDue && isEditingTotal ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editTotalValue}
                  onChange={(e) => setEditTotalValue(e.target.value)}
                  className="h-8 w-24"
                  autoFocus
                />
                <Button size="icon" className="h-8 w-8" onClick={handleSaveTotal}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditTotal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">
                  {totalDue != null ? totalDue.toFixed(2) : '—'}
                </span>
                {canEditTotalAmountDue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditTotalValue(totalDue != null ? String(totalDue) : '');
                      setIsEditingTotal(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Total pagado</p>
            <p className="text-sm font-medium text-foreground">{totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Pendiente</p>
            <p className="text-sm font-medium text-foreground">
              {pending != null ? pending.toFixed(2) : '—'}
            </p>
          </div>
        </div>

        {/* Paquetes adquiridos (cuenta del titular) */}
        <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShoppingBag className="w-4 h-4 text-primary shrink-0" />
              Paquetes adquiridos
            </div>
            {!isAddingPackage && (
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setIsAddingPackage(true)}>
                <Plus className="w-3.5 h-3.5" />
                Añadir paquete
              </Button>
            )}
          </div>
          {packagesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando paquetes…
            </div>
          ) : isAddingPackage ? (
            <div className="space-y-2 border border-dashed border-border/70 rounded-md p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Paquete (producto)</Label>
                  <Select value={newPackageProductId || undefined} onValueChange={(v) => setNewPackageProductId(v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecciona un paquete" />
                    </SelectTrigger>
                    <SelectContent>
                      {productChoices.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {familyMembers.length > 0 && (
                  <div>
                    <Label className="text-xs">Familiar (opcional)</Label>
                    <Select value={newPackageBeneficiaryId} onValueChange={setNewPackageBeneficiaryId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {familyMembers.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingPackage(false);
                    setNewPackageProductId('');
                    setNewPackageBeneficiaryId('none');
                  }}
                >
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={handleAddAcquiredPackage} disabled={!newPackageProductId}>
                  Guardar paquete
                </Button>
              </div>
            </div>
          ) : null}
          {!packagesLoading && !isAddingPackage && acquiredPackages.length === 0 && (
            <p className="text-xs text-muted-foreground">Aún no hay paquetes registrados. Usa «Añadir paquete» para listar lo adquirido.</p>
          )}
          {!packagesLoading && acquiredPackages.length > 0 && (
            <ul className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {acquiredPackages.map((pkg) => (
                <li
                  key={pkg.id}
                  className="flex items-start justify-between gap-2 text-sm rounded-md border border-border/40 bg-background/80 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{pkg.product?.title ?? 'Paquete'}</span>
                    {pkg.beneficiary && (
                      <span className="text-muted-foreground text-xs block">Para: {pkg.beneficiary.name}</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAcquiredPackage(pkg.id)}
                    title="Quitar paquete de la lista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagos eliminados (permiso de auditoría) */}
        {canViewAuditLogs && (
          <Collapsible open={deletedHistoryOpen} onOpenChange={setDeletedHistoryOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  {deletedHistoryOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Trash2 className="w-4 h-4" />
                  Pagos eliminados
                  {paymentDeletedHistory.length > 0 && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{paymentDeletedHistory.length}</span>
                  )}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                {paymentDeletedHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">No hay pagos eliminados registrados.</p>
                ) : (
                  <ul className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
                    {paymentDeletedHistory.map((entry) => (
                      <li key={entry.id} className="p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-muted-foreground">
                            {format(new Date(entry.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                          </span>
                          {entry.deletedByUser?.name && (
                            <span className="font-medium text-foreground">
                              {entry.deletedByUser.name} eliminó
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-foreground">
                          <span className="font-medium">{entry.amount.toFixed(2)}</span>
                          {' · '}
                          <span className="text-muted-foreground">
                            {PAYMENT_TYPE_LABELS[(entry.paymentType as PaymentType) || 'efectivo']}
                          </span>
                          {' · '}
                          <span className="text-muted-foreground">
                            {format(new Date(entry.paymentDate), "d MMM yyyy", { locale: es })}
                          </span>
                          {entry.referenceNumber && (
                            <span className="block text-muted-foreground truncate mt-0.5">
                              Ticket/Transferencia: {entry.referenceNumber}
                            </span>
                          )}
                          {entry.note && (
                            <span className="block text-muted-foreground truncate mt-0.5">— {entry.note}</span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Add payment form */}
        {isAdding && (
          <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="payment-amount" className="text-xs">
                  Monto
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="payment-date" className="text-xs">
                  Fecha
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Tipo de pago</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {PAYMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Asociar a paquete (opcional)</Label>
              <Select value={paymentPackageId} onValueChange={setPaymentPackageId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sin asociar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asociar</SelectItem>
                  {acquiredPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.product?.title ?? 'Paquete'}
                      {pkg.beneficiary ? ` · ${pkg.beneficiary.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-reference" className="text-xs">
                Número de ticket o transferencia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment-reference"
                type="text"
                required
                placeholder="Ej: TKT-123456"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="mt-1"
                aria-required={true}
              />
            </div>
            <div>
              <Label htmlFor="payment-note" className="text-xs">
                Nota (opcional)
              </Label>
              <Textarea
                id="payment-note"
                placeholder="Nota del pago..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 min-h-[60px] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setAmount('');
                  setPaymentType('efectivo');
                  setReferenceNumber('');
                  setNote('');
                  setPaymentPackageId('__none__');
                }}
                className="gap-1.5"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitPayment}
                disabled={
                  !amount.trim() ||
                  parseFloat(amount) <= 0 ||
                  !paymentDate.trim() ||
                  !referenceNumber.trim()
                }
                className="gap-1.5"
              >
                <Check className="w-4 h-4" />
                Guardar
              </Button>
            </div>
          </div>
        )}

        {/* Historial unificado: origen de cada movimiento */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Cada línea indica el origen: <span className="text-foreground font-medium">Registrar pago</span>,{' '}
            <span className="text-foreground font-medium">Total a pagar</span> (ajuste del monto) o{' '}
            <span className="text-foreground font-medium">Añadir paquete</span>.
          </p>
          {timelineItems.length === 0 && !isAdding ? (
            <div className="text-center py-6 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay movimientos aún</p>
              <p className="text-xs">Registra un pago o añade un paquete para ver el historial</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {timelineItems.map((item) =>
                item.kind === 'payment' ? (
                  <div
                    key={item.id}
                    className="group flex items-start justify-between gap-2 bg-muted/30 border border-border/30 rounded-lg p-3 hover:border-border/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-primary bg-primary/12 px-1.5 py-0.5 rounded">
                          Registrar pago
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">
                          {Number(item.payment.amount).toFixed(2)}
                        </p>
                        <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {PAYMENT_TYPE_LABELS[item.payment.paymentType || 'efectivo']}
                        </span>
                        {item.payment.acquiredPackage?.product?.title && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded max-w-[200px] truncate">
                            Paquete: {item.payment.acquiredPackage.product.title}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {item.payment.acquiredPackage?.product?.title
                          ? 'Pago vinculado a un paquete adquirido.'
                          : 'Pago general (sin paquete asociado).'}
                      </p>
                      {item.payment.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.payment.note}
                        </p>
                      )}
                      {item.payment.referenceNumber && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          Ticket/Transferencia: {item.payment.referenceNumber}
                        </p>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Fecha del pago:{' '}
                        {format(new Date(item.payment.paymentDate), 'd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    {onDeletePayment && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeletePayment(item.payment.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ) : item.kind === 'amount_due' ? (
                  <div
                    key={item.id}
                    className="bg-muted/30 border border-amber-500/25 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-800 dark:text-amber-200 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Total a pagar
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ajuste del monto total desde el resumen «Total a pagar» (no es un pago recibido).
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(item.entry.createdAt), 'd MMM yyyy, HH:mm', { locale: es })}
                      </span>
                      {item.entry.changedByUser?.name && (
                        <span className="font-medium text-foreground">{item.entry.changedByUser.name}</span>
                      )}
                    </div>
                    <p className="mt-1 text-muted-foreground text-sm">
                      <span className={item.entry.previousValue != null ? 'text-foreground' : ''}>
                        {item.entry.previousValue != null ? item.entry.previousValue.toFixed(2) : '—'}
                      </span>
                      {' → '}
                      <span className={item.entry.newValue != null ? 'text-foreground font-medium' : ''}>
                        {item.entry.newValue != null ? item.entry.newValue.toFixed(2) : '—'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div key={item.id} className="bg-muted/30 border border-violet-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase tracking-wide font-semibold text-violet-800 dark:text-violet-200 bg-violet-500/12 px-1.5 py-0.5 rounded">
                        Añadir paquete
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Registro desde «Paquetes adquiridos» al añadir un paquete a la cuenta.
                    </p>
                    <p className="text-sm font-medium text-foreground mt-1">
                      {item.pkg.product?.title ?? 'Paquete'}
                    </p>
                    {item.pkg.beneficiary && (
                      <p className="text-xs text-muted-foreground">Para: {item.pkg.beneficiary.name}</p>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {format(new Date(item.pkg.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
