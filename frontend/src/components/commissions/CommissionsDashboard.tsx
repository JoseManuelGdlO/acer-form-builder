import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Trash2, Users, UserPlus, Pencil, Check, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type {
  CommissionPeriodType,
  CommissionRateType,
  CommissionUserRate,
  CommissionsOverviewResponse,
} from '@/types/commission';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

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
    if (!token || !canPayCommissions) return;

    const periodLabel = PAY_PERIOD_OPTIONS.find((option) => option.key === payPeriodType)?.label ?? 'periodo';
    if (!window.confirm(`¿Liquidar comisiones del periodo ${periodLabel}?`)) return;

    setIsPaying(true);
    try {
      const response = await api.payCommissionsBatch({ periodType: payPeriodType }, token);
      toast.success(`Comisiones pagadas: ${formatter.format(response.totalAmount)}`);
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo pagar comisiones');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Comisiones 360</h1>
        <p className="text-muted-foreground text-sm">
          Configura usuarios con comisión por porcentaje o monto fijo. Se calcula sobre pagos de clientes titulares con asesor asignado.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios en comisiones
          </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Cada usuario puede tener comisión por porcentaje del pago o por monto fijo por venta.
        </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUpdateSettings && (
            <form onSubmit={handleAddUser} className="flex flex-wrap items-end gap-3 pb-4 border-b border-border/50">
              <div className="space-y-2 min-w-[200px] flex-1">
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
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
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
                <UserPlus className="w-4 h-4 mr-2" />
                {isAddingUser ? 'Agregando…' : 'Agregar'}
              </Button>
            </form>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : commissionUserRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No hay usuarios configurados. Agrega usuarios con su comisión para calcular pagos.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Fecha de venta</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead className="text-right">Comisión pendiente</TableHead>
                    <TableHead className="text-right">Pagos</TableHead>
                    {canUpdateSettings && <TableHead className="w-[100px] text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissionUserRows.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatSaleDate(user.lastSaleDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingUserId === user.userId ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={editingRateType}
                              onChange={(e) => {
                                const rateType = e.target.value as CommissionRateType;
                                setEditingRateType(rateType);
                              }}
                              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            >
                              {RATE_TYPE_OPTIONS.map((option) => (
                                <option key={option.key} value={option.key}>{option.label}</option>
                              ))}
                            </select>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editingRate}
                              onChange={(e) => setEditingRate(e.target.value)}
                              className="w-24 h-8 text-right"
                              autoFocus
                            />
                            {editingRateType === 'percentage' && (
                              <span className="text-muted-foreground">%</span>
                            )}
                          </div>
                        ) : (
                          formatUserRate(user)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatter.format(user.earned)}
                      </TableCell>
                      <TableCell className="text-right">{user.paymentsCount}</TableCell>
                      {canUpdateSettings && (
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {editingUserId === user.userId ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={isSavingRate}
                                  onClick={() => handleSaveUserRate(user.userId)}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" onClick={cancelEditRate}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button type="button" variant="ghost" size="icon" onClick={() => startEditRate(user)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleRemoveUser(user.userId, user.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Totales</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatter.format(commissionTotals.earned)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{commissionTotals.paymentsCount}</TableCell>
                    {canUpdateSettings && <TableCell />}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {commissionUsers.length > 0 && canPayCommissions && (
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div>
                <h3 className="text-sm font-medium">Periodos a pagar</h3>
                <p className="text-sm text-muted-foreground font-normal mt-1">
                  Selecciona el periodo y guarda para liquidar las comisiones pendientes automáticamente.
                </p>
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
                <Label htmlFor="pay-day-of-month" className="text-sm text-muted-foreground shrink-0">
                  Día de pago:
                </Label>
                <select
                  id="pay-day-of-month"
                  value={payDayOfMonth}
                  onChange={(e) => setPayDayOfMonth(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium min-w-[100px]"
                >
                  {PAY_DAY_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      Día {day}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">de cada mes</span>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={handlePayPeriod} disabled={isPaying}>
                  <Save className="w-4 h-4 mr-2" />
                  {isPaying ? 'Guardando…' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
