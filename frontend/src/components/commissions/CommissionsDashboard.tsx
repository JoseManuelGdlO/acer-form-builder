import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, UserPlus, Pencil, Check, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  CommissionPayoutPreviewResponse,
  CommissionPeriodType,
  CommissionRateType,
  CommissionUserRate,
  CommissionsOverviewResponse,
} from '@/types/commission';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { cn } from '@/lib/utils';

const formatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

const formatUserRate = (user: Pick<CommissionUserRate, 'rateType' | 'ratePct' | 'fixedAmount'>): string => {
  if ((user.rateType || 'percentage') === 'fixed') {
    return `${formatter.format(user.fixedAmount ?? 0)} fijo`;
  }
  return `${user.ratePct}%`;
};

const RATE_TYPE_OPTIONS: Array<{ key: CommissionRateType; label: string; valueLabel: string }> = [
  { key: 'percentage', label: 'Porcentaje', valueLabel: 'Porcentaje (%)' },
  { key: 'fixed', label: 'Monto fijo', valueLabel: 'Monto fijo (MXN)' },
];

const PAY_PERIOD_OPTIONS: Array<{ key: CommissionPeriodType; label: string }> = [
  { key: 'monthly', label: 'Mensual' },
  { key: 'bimonthly', label: 'Bimestral' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'semiannual', label: 'Semestral' },
  { key: 'annual', label: 'Anual' },
];

const PAY_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

const formatSaleDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    return format(parseISO(value.length === 10 ? `${value}T12:00:00` : value), 'dd/MM/yyyy', { locale: es });
  } catch {
    return value;
  }
};

const formatSignedPct = (value: number | undefined): string | null => {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
};

function buildReferenceDate(dayOfMonth: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const CommissionsDashboard = () => {
  const { token, can } = useAuth();
  const canUpdateSettings = can('commissions.update');
  const canPayCommissions = can('commissions.create');

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<CommissionsOverviewResponse | null>(null);
  const [commissionUsers, setCommissionUsers] = useState<CommissionUserRate[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [newUserId, setNewUserId] = useState('');
  const [newUserRateType, setNewUserRateType] = useState<CommissionRateType>('percentage');
  const [newUserRate, setNewUserRate] = useState('10');
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRateType, setEditingRateType] = useState<CommissionRateType>('percentage');
  const [editingRate, setEditingRate] = useState('');
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [payPeriodType, setPayPeriodType] = useState<CommissionPeriodType>('monthly');
  const [payDayOfMonth, setPayDayOfMonth] = useState(() => new Date().getDate());
  const [isPaying, setIsPaying] = useState(false);
  const [payoutPreview, setPayoutPreview] = useState<CommissionPayoutPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);

  const availableUsers = useMemo(() => {
    const configuredIds = new Set(commissionUsers.map((u) => u.userId));
    return allUsers.filter((u) => !configuredIds.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, commissionUsers]);

  const commissionUserRows = useMemo(() => {
    const statsMap = new Map((data?.breakdowns.advisors ?? []).map((row) => [row.key, row]));
    return commissionUsers.map((user) => {
      const stats = statsMap.get(user.userId);
      return {
        ...user,
        earned: stats?.earned ?? 0,
        paymentsCount: stats?.count ?? 0,
        lastSaleDate: stats?.lastSaleDate ?? null,
      };
    });
  }, [commissionUsers, data?.breakdowns.advisors]);

  const commissionTotals = useMemo(
    () =>
      commissionUserRows.reduce(
        (acc, row) => ({
          earned: acc.earned + row.earned,
          paymentsCount: acc.paymentsCount + row.paymentsCount,
        }),
        { earned: 0, paymentsCount: 0 }
      ),
    [commissionUserRows]
  );

  useEffect(() => {
    if (!token) return;
    api.getUsers(token)
      .then((list) => {
        const users = (Array.isArray(list) ? list : []) as Array<{ id: string; name: string }>;
        setAllUsers(users.map((u) => ({ id: u.id, name: u.name })).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setAllUsers([]));
  }, [token]);

  const loadOverview = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.getCommissionsOverview(token);
      setData(response);
      setCommissionUsers(response.meta?.configuredUsers ?? []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar comisiones';
      if (message.includes('Route not found')) {
        toast.error(
          'El backend no tiene el módulo de comisiones. Reinicia Vite con API local (localhost:3000) o despliega el backend actualizado.'
        );
      } else {
        toast.error(message);
      }
      setData(null);
      setCommissionUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setIsPreviewLoading(true);
    api
      .getCommissionPayoutPreview(
        { periodType: payPeriodType, referenceDate: buildReferenceDate(payDayOfMonth) },
        token
      )
      .then((response) => {
        if (!cancelled) setPayoutPreview(response);
      })
      .catch(() => {
        if (!cancelled) setPayoutPreview(null);
      })
      .finally(() => {
        if (!cancelled) setIsPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, payPeriodType, payDayOfMonth, previewNonce]);

  const periodAlreadyPaid = payoutPreview?.alreadyPaid === true;
  const nothingPending =
    Boolean(payoutPreview) && !periodAlreadyPaid && (payoutPreview?.totalAmount ?? 0) === 0;
  const canSubmitPayout =
    canPayCommissions &&
    Boolean(payoutPreview) &&
    !periodAlreadyPaid &&
    (payoutPreview?.totalAmount ?? 0) > 0 &&
    !isPaying &&
    !isLoading &&
    !isPreviewLoading;
  const payoutPeriodLabel =
    payoutPreview?.period.label ||
    (payoutPreview
      ? `${payoutPreview.period.periodFrom} – ${payoutPreview.period.periodTo}`
      : PAY_PERIOD_OPTIONS.find((option) => option.key === payPeriodType)?.label ?? 'periodo');
  const paidPayouts = data?.paidPayouts ?? [];

  const buildRatePayload = (
    rateType: CommissionRateType,
    rawValue: string
  ): { rateType: CommissionRateType; ratePct?: number; fixedAmount?: number } | null => {
    const value = parseFloat(rawValue.replace(',', '.'));
    if (Number.isNaN(value) || value < 0) return null;
    if (rateType === 'fixed') {
      return { rateType, fixedAmount: value };
    }
    if (value > 100) return null;
    return { rateType, ratePct: value };
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !canUpdateSettings) return;
    const payload = buildRatePayload(newUserRateType, newUserRate);
    if (!newUserId) {
      toast.error('Selecciona un usuario');
      return;
    }
    if (!payload) {
      toast.error(
        newUserRateType === 'fixed'
          ? 'Indica un monto fijo mayor o igual a 0'
          : 'Indica un porcentaje entre 0 y 100'
      );
      return;
    }
    setIsAddingUser(true);
    try {
      const response = await api.addCommissionUser(newUserId, payload, token);
      setCommissionUsers(response.users);
      setNewUserId('');
      setNewUserRateType('percentage');
      setNewUserRate('10');
      toast.success('Usuario agregado a comisiones');
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar');
    } finally {
      setIsAddingUser(false);
    }
  };

  const startEditRate = (user: CommissionUserRate) => {
    setEditingUserId(user.userId);
    setEditingRateType(user.rateType || 'percentage');
    setEditingRate(String(user.rateType === 'fixed' ? user.fixedAmount : user.ratePct));
  };

  const cancelEditRate = () => {
    setEditingUserId(null);
    setEditingRateType('percentage');
    setEditingRate('');
  };

  const handleSaveUserRate = async (userId: string) => {
    if (!token || !canUpdateSettings) return;
    const payload = buildRatePayload(editingRateType, editingRate);
    if (!payload) {
      toast.error(
        editingRateType === 'fixed'
          ? 'Indica un monto fijo mayor o igual a 0'
          : 'Indica un porcentaje entre 0 y 100'
      );
      return;
    }
    setIsSavingRate(true);
    try {
      const response = await api.updateCommissionUserRate(userId, payload, token);
      setCommissionUsers(response.users);
      toast.success('Comisión actualizada');
      cancelEditRate();
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleRemoveUser = async (userId: string, name: string) => {
    if (!token || !canUpdateSettings) return;
    if (!window.confirm(`¿Quitar a ${name} de comisiones?`)) return;
    try {
      const response = await api.removeCommissionUser(userId, token);
      setCommissionUsers(response.users);
      toast.success('Usuario eliminado de comisiones');
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  const handlePayPeriod = async () => {
    if (!token || !canPayCommissions || !payoutPreview) return;
    if (payoutPreview.alreadyPaid || payoutPreview.totalAmount === 0) return;

    if (
      !window.confirm(
        `¿Liquidar comisiones del periodo ${payoutPeriodLabel} por un total de ${formatter.format(payoutPreview.totalAmount)}?`
      )
    ) {
      return;
    }

    setIsPaying(true);
    try {
      const response = await api.payCommissionsBatch(
        { periodType: payPeriodType, referenceDate: buildReferenceDate(payDayOfMonth) },
        token
      );
      toast.success(`Comisiones pagadas: ${formatter.format(response.totalAmount)}`);
      await loadOverview();
      setPreviewNonce((n) => n + 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo pagar comisiones');
    } finally {
      setIsPaying(false);
    }
  };

  const kpis = data?.kpis;
  const growthHint = formatSignedPct(kpis?.growthVsPreviousPct);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6 lg:p-8">
      {kpis ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Comisión ganada</p>
            <p className="mt-2 font-display text-2xl font-semibold">{formatter.format(kpis.totalEarned)}</p>
            <p className={cn('mt-1 text-xs', (kpis.growthVsPreviousPct ?? 0) < 0 ? 'text-destructive' : 'text-success')}>
              {growthHint ? `${growthHint} vs periodo anterior` : 'Sobre ventas cobradas'}
            </p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Pendiente de liquidar</p>
            <p className="mt-2 font-display text-2xl font-semibold">{formatter.format(kpis.totalPending)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Aún no pagada en lote</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Comisión promedio</p>
            <p className="mt-2 font-display text-2xl font-semibold">{formatter.format(kpis.averageCommission)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Promedio por pago pendiente</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs text-muted-foreground">Base de pagos</p>
            <p className="mt-2 font-display text-2xl font-semibold">{formatter.format(kpis.paymentsBaseAmount)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Pagos de titulares con asesor</p>
          </Card>
        </div>
      ) : null}

      <Card className="p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Comisiones del equipo</h2>
            <p className="text-xs text-muted-foreground">
              Calculadas sobre ventas cobradas de clientes titulares con asesor asignado.
            </p>
          </div>
          {commissionUsers.length > 0 && canPayCommissions ? (
            <Button type="button" onClick={handlePayPeriod} disabled={!canSubmitPayout}>
              <Save className="size-4" />
              {isPaying ? 'Guardando…' : 'Guardar / liquidar'}
            </Button>
          ) : null}
        </div>

        {canUpdateSettings && (
          <form onSubmit={handleAddUser} className="mb-4 flex flex-wrap items-end gap-3 border-b border-border/50 pb-4">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label>Agregar usuario</Label>
              <select
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Selecciona usuario</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-rate-type">Tipo</Label>
              <select
                id="new-user-rate-type"
                value={newUserRateType}
                onChange={(e) => {
                  const rateType = e.target.value as CommissionRateType;
                  setNewUserRateType(rateType);
                  setNewUserRate(rateType === 'fixed' ? '100' : '10');
                }}
                className="h-10 min-w-[140px] w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {RATE_TYPE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-rate">
                {RATE_TYPE_OPTIONS.find((option) => option.key === newUserRateType)?.valueLabel}
              </Label>
              <Input
                id="new-user-rate"
                type="text"
                inputMode="decimal"
                value={newUserRate}
                onChange={(e) => setNewUserRate(e.target.value)}
                className="w-32"
              />
            </div>
            <Button type="submit" disabled={isAddingUser || availableUsers.length === 0}>
              <UserPlus className="size-4" />
              {isAddingUser ? 'Agregando…' : 'Agregar'}
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : commissionUserRows.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No hay usuarios configurados. Agrega usuarios con su comisión para calcular pagos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[1fr_140px_120px_140px_80px_auto] gap-3 text-xs text-muted-foreground">
              <span>Asesor</span>
              <span>Tipo</span>
              <span>Tasa</span>
              <span className="text-right">Pendiente</span>
              <span className="text-right">Pagos</span>
              <span />
            </div>
            {commissionUserRows.map((user) => (
              <div
                key={user.userId}
                className="grid min-w-[720px] grid-cols-[1fr_140px_120px_140px_80px_auto] items-center gap-3 border-t py-3 text-sm"
              >
                <div>
                  <span className="font-medium">{user.name}</span>
                  <p className="text-xs text-muted-foreground">Última venta: {formatSaleDate(user.lastSaleDate)}</p>
                </div>
                {editingUserId === user.userId ? (
                  <select
                    value={editingRateType}
                    onChange={(e) => setEditingRateType(e.target.value as CommissionRateType)}
                    className="h-10 rounded-md border border-input bg-background p-2 text-sm"
                  >
                    {RATE_TYPE_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted-foreground">
                    {RATE_TYPE_OPTIONS.find((option) => option.key === (user.rateType || 'percentage'))?.label}
                  </span>
                )}
                {editingUserId === user.userId ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={editingRate}
                      onChange={(e) => setEditingRate(e.target.value)}
                      className="h-10"
                      autoFocus
                    />
                    {editingRateType === 'percentage' ? (
                      <span className="text-muted-foreground">%</span>
                    ) : null}
                  </div>
                ) : (
                  <span>{formatUserRate(user)}</span>
                )}
                <b className="text-right text-success">{formatter.format(user.earned)}</b>
                <span className="text-right text-muted-foreground">{user.paymentsCount}</span>
                {canUpdateSettings ? (
                  <div className="flex items-center justify-end gap-1">
                    {editingUserId === user.userId ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isSavingRate}
                          onClick={() => handleSaveUserRate(user.userId)}
                        >
                          <Check className="size-4 text-success" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={cancelEditRate}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button type="button" variant="ghost" size="icon" onClick={() => startEditRate(user)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemoveUser(user.userId, user.name)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <div className="grid min-w-[720px] grid-cols-[1fr_140px_120px_140px_80px_auto] items-center gap-3 border-t py-3 text-sm font-semibold">
              <span>Totales</span>
              <span />
              <span />
              <span className="text-right text-success">{formatter.format(commissionTotals.earned)}</span>
              <span className="text-right">{commissionTotals.paymentsCount}</span>
              <span />
            </div>
          </div>
        )}

        <div className="mt-4 space-y-4 border-t border-border/50 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle title="Periodo a liquidar" className="mb-1" />
              <p className="text-sm text-muted-foreground">
                Preview del lote con los mismos criterios que se enviarán al pagar.
              </p>
            </div>
            {periodAlreadyPaid ? <StatusBadge tone="warning">Periodo ya liquidado</StatusBadge> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {PAY_PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.key}
                type="button"
                size="sm"
                variant={payPeriodType === option.key ? 'default' : 'outline'}
                onClick={() => setPayPeriodType(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
            <Label htmlFor="pay-day-of-month" className="shrink-0 text-sm text-muted-foreground">
              Día de referencia:
            </Label>
            <select
              id="pay-day-of-month"
              value={payDayOfMonth}
              onChange={(e) => setPayDayOfMonth(Number(e.target.value))}
              className="h-9 min-w-[100px] rounded-md border border-input bg-background px-3 text-sm font-medium"
            >
              {PAY_DAY_OPTIONS.map((day) => (
                <option key={day} value={day}>
                  Día {day}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">del mes actual (cierra el periodo)</span>
          </div>

          {isPreviewLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Calculando preview…
            </div>
          ) : payoutPreview ? (
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs text-muted-foreground">
                {payoutPeriodLabel}
              </p>
              <div className="grid min-w-[560px] grid-cols-[1fr_120px_140px_80px] gap-3 text-xs text-muted-foreground">
                <span>Asesor</span>
                <span>Tasa</span>
                <span className="text-right">Monto</span>
                <span className="text-right">Pagos</span>
              </div>
              {(payoutPreview.users ?? []).map((user) => (
                <div
                  key={user.key}
                  className="grid min-w-[560px] grid-cols-[1fr_120px_140px_80px] items-center gap-3 border-t py-3 text-sm"
                >
                  <span className="font-medium">{user.label}</span>
                  <span>{formatUserRate(user)}</span>
                  <b className="text-right text-success">{formatter.format(user.earned)}</b>
                  <span className="text-right text-muted-foreground">{user.count}</span>
                </div>
              ))}
              {(payoutPreview.users ?? []).length === 0 ? (
                <p className="border-t py-3 text-sm text-muted-foreground">
                  No hay asesores con comisión en este periodo.
                </p>
              ) : null}
              <div className="grid min-w-[560px] grid-cols-[1fr_120px_140px_80px] items-center gap-3 border-t py-3 text-sm font-semibold">
                <span>Total</span>
                <span />
                <span className="text-right text-success">{formatter.format(payoutPreview.totalAmount)}</span>
                <span />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No se pudo cargar el preview de este periodo.</p>
          )}

          {nothingPending ? (
            <p className="text-sm text-muted-foreground">Nada pendiente en este periodo.</p>
          ) : null}

          {canPayCommissions ? (
            <div className="flex justify-end">
              <Button type="button" onClick={handlePayPeriod} disabled={!canSubmitPayout}>
                <Save className="size-4" />
                {isPaying ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
          <SectionTitle title="Historial de liquidaciones" className="mb-1" />
          {paidPayouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay liquidaciones.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[720px] grid-cols-[120px_1fr_140px_1fr_160px] gap-3 text-xs text-muted-foreground">
                <span>Fecha</span>
                <span>Asesor</span>
                <span className="text-right">Monto</span>
                <span>Concepto</span>
                <span>Periodo</span>
              </div>
              {paidPayouts.map((payout) => (
                <div
                  key={payout.id}
                  className="grid min-w-[720px] grid-cols-[120px_1fr_140px_1fr_160px] items-center gap-3 border-t py-3 text-sm"
                >
                  <span className="text-muted-foreground">{formatSaleDate(payout.payoutDate)}</span>
                  <span className="font-medium">{payout.advisorName}</span>
                  <b className="text-right text-success">{formatter.format(payout.amount)}</b>
                  <span className="truncate text-muted-foreground" title={payout.concept}>
                    {payout.concept || '—'}
                  </span>
                  <span className="truncate text-muted-foreground" title={payout.periodLabel}>
                    {payout.periodLabel || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
