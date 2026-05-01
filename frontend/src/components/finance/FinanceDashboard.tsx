import { useEffect, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import { Loader2, TrendingUp, Wallet, Landmark, Percent, Receipt, RotateCcw, Trash2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PAYMENT_TYPE_LABELS, type PaymentType } from '@/types/form';
import type { FinanceGranularity, FinanceOverviewResponse } from '@/types/finance';
import { api } from '@/lib/api';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { exportFinanceOverviewPdf, formatDateRangeLabel, type FinancePdfFilterLabels } from '@/lib/financePdfExport';

const GRANULARITIES: Array<{ key: FinanceGranularity; label: string }> = [
  { key: 'hourly', label: 'Por hora' },
  { key: 'daily', label: 'Diaria' },
  { key: 'weekly', label: 'Semana' },
  { key: 'monthly', label: 'Mes' },
  { key: 'bimonthly', label: 'Bimestral' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'semiannual', label: 'Semestral' },
  { key: 'annual', label: 'Anual' },
];

const DEFAULT_GRANULARITY: FinanceGranularity = 'monthly';

const formatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

const pieColors = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#06b6d4'];

type LoadParams = {
  granularity?: FinanceGranularity;
  from?: string;
  to?: string;
  paymentType?: string;
  productId?: string;
  assignedUserId?: string;
  branchId?: string;
};

export const FinanceDashboard = () => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinanceOverviewResponse | null>(null);
  const [granularity, setGranularity] = useState<FinanceGranularity>(DEFAULT_GRANULARITY);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [productId, setProductId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [products, setProducts] = useState<Array<{ id: string; title: string }>>([]);
  const [advisors, setAdvisors] = useState<Array<{ id: string; name: string }>>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [expenseConcept, setExpenseConcept] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseNote, setExpenseNote] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Load product list for the product filter dropdown
  useEffect(() => {
    if (!token) return;
    api.getProducts(token).then((list) => {
      const mapped = (Array.isArray(list) ? list : []).map((p: { id: string; title: string }) => ({ id: p.id, title: p.title }));
      setProducts(mapped);
    }).catch(() => setProducts([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    api.getUsers(token)
      .then((list) => {
        const users = (Array.isArray(list) ? list : []) as Array<{ id: string; name: string; role?: { systemKey?: string | null } }>;
        const mapped = users
          .filter((u) => u.role?.systemKey === 'reviewer')
          .map((u) => ({ id: u.id, name: u.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setAdvisors(mapped);
      })
      .catch(() => setAdvisors([]));

    api.getBranches(token)
      .then((list) => {
        const bs = (Array.isArray(list) ? list : []) as Array<{ id: string; name: string; isActive?: boolean; is_active?: boolean }>;
        const mapped = bs
          .filter((b) => (b.isActive ?? b.is_active ?? true) === true)
          .map((b) => ({ id: b.id, name: b.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setBranches(mapped);
      })
      .catch(() => setBranches([]));
  }, [token]);

  // Core load function — accepts optional param overrides so reset can bypass stale state
  const loadOverview = async (overrides?: LoadParams) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const g = overrides?.granularity ?? granularity;
      const f = overrides?.from !== undefined ? overrides.from : from;
      const t = overrides?.to !== undefined ? overrides.to : to;
      const pt = overrides?.paymentType !== undefined ? overrides.paymentType : paymentType;
      const pid = overrides?.productId !== undefined ? overrides.productId : productId;
      const au = overrides?.assignedUserId !== undefined ? overrides.assignedUserId : assignedUserId;
      const bid = overrides?.branchId !== undefined ? overrides.branchId : branchId;

      const response = await api.getFinanceOverview(
        {
          granularity: g,
          from: f || undefined,
          to: t || undefined,
          paymentType: (pt as 'tarjeta' | 'transferencia' | 'efectivo') || undefined,
          productId: pid || undefined,
          assignedUserId: au || undefined,
          branchId: bid || undefined,
        },
        token
      );
      setData(response);
    } catch (error: unknown) {
      console.error('Finance overview error', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar finanzas');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load when granularity changes (other filters are applied manually)
  useEffect(() => {
    loadOverview();
  }, [token, granularity]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    setFrom('');
    setTo('');
    setPaymentType('');
    setProductId('');
    setAssignedUserId('');
    setBranchId('');
    setGranularity(DEFAULT_GRANULARITY);
    loadOverview({
      granularity: DEFAULT_GRANULARITY,
      from: '',
      to: '',
      paymentType: '',
      productId: '',
      assignedUserId: '',
      branchId: '',
    });
  };

  const kpis = data?.kpis;
  const timeSeriesData = data?.timeseries ?? [];
  const paymentTypesData = data?.breakdowns.paymentTypes ?? [];
  const productsBreakdown = data?.breakdowns.products ?? [];
  const topClients = data?.rankings.topClients ?? [];
  const topTrips = data?.rankings.topTrips ?? [];
  const manualExpenses = data?.manualExpenses ?? [];

  const handleCreateManualExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amount = parseFloat(expenseAmount.replace(',', '.'));
    if (!expenseConcept.trim() || Number.isNaN(amount) || amount <= 0) {
      toast.error('Indica concepto y un monto válido');
      return;
    }
    setIsSavingExpense(true);
    try {
      await api.createFinanceExpense(
        {
          concept: expenseConcept.trim(),
          amount,
          expenseDate,
          note: expenseNote.trim() || undefined,
        },
        token
      );
      toast.success('Egreso registrado');
      setExpenseConcept('');
      setExpenseAmount('');
      setExpenseNote('');
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteManualExpense = async (id: string) => {
    if (!token) return;
    if (!window.confirm('¿Eliminar este egreso de finanzas?')) return;
    try {
      await api.deleteFinanceExpense(id, token);
      toast.success('Egreso eliminado');
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    }
  };

  const handleExportPdf = () => {
    if (!data?.kpis) {
      toast.error('Aplica los filtros y espera a que carguen los datos para exportar.');
      return;
    }
    const labels: FinancePdfFilterLabels = {
      granularityLabel: GRANULARITIES.find((g) => g.key === data.meta.granularity)?.label ?? data.meta.granularity,
      fromLabel: formatDateRangeLabel(data.meta.from),
      toLabel: formatDateRangeLabel(data.meta.to),
      paymentLabel: data.meta.paymentType
        ? PAYMENT_TYPE_LABELS[data.meta.paymentType as PaymentType] ?? data.meta.paymentType
        : 'Todos',
      productLabel: data.meta.productId
        ? products.find((p) => p.id === data.meta.productId)?.title ?? data.meta.productId
        : 'Todos',
      advisorLabel: data.meta.assignedUserId
        ? advisors.find((a) => a.id === data.meta.assignedUserId)?.name ?? data.meta.assignedUserId
        : 'Todos',
      branchLabel: data.meta.branchId
        ? branches.find((b) => b.id === data.meta.branchId)?.name ?? data.meta.branchId
        : 'Todas',
    };
    exportFinanceOverviewPdf(data, labels, formatter);
    toast.success('PDF descargado');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Finanzas 360</h1>
        <p className="text-muted-foreground text-sm">Ganancia neta, tendencias y estadisticas operativas de la empresa.</p>
      </div>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Filtros</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isLoading || !data?.kpis}
            className="shrink-0"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Periodicidad */}
          <div className="flex flex-wrap gap-2">
            {GRANULARITIES.map((g) => (
              <Button
                key={g.key}
                type="button"
                size="sm"
                variant={granularity === g.key ? 'default' : 'outline'}
                onClick={() => setGranularity(g.key)}
              >
                {g.label}
              </Button>
            ))}
          </div>

          {/* Inputs de filtro */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm col-span-1"
              placeholder="Desde"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm col-span-1"
              placeholder="Hasta"
            />
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Tipo de pago (todos)</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
            </select>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Producto (todos)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Asesor (todos)</option>
              {advisors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sucursal (todas)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button type="button" onClick={() => loadOverview()} disabled={isLoading} className="flex-1">
                Aplicar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                title="Restablecer filtros"
                className="px-3"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !data || !kpis ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay datos financieros para este rango.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs principales */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard title="Ganancia Neta" value={formatter.format(kpis.netProfit)} icon={<Wallet className="w-5 h-5" />} />
            <StatCard title="Ingresos" value={formatter.format(kpis.totalIncome)} icon={<TrendingUp className="w-5 h-5" />} />
            <StatCard
              title="Egresos (manuales)"
              value={formatter.format(kpis.totalExpense)}
              icon={<Landmark className="w-5 h-5" />}
            />
            <StatCard title="Margen Neto" value={`${kpis.netMarginPct}%`} icon={<Percent className="w-5 h-5" />} />
            <StatCard title="Ticket Promedio" value={formatter.format(kpis.averageTicket)} icon={<Receipt className="w-5 h-5" />} />
            <StatCard title="Crecimiento" value={`${kpis.growthVsPreviousPct}%`} icon={<TrendingUp className="w-5 h-5" />} />
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Egresos manuales</CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Los gastos que registres en un viaje no se suman aquí. Usa este apartado para cargar egresos de la empresa con
                concepto (operación, nómina, servicios, etc.).
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleCreateManualExpense} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fin-exp-concept">Concepto</Label>
                  <Input
                    id="fin-exp-concept"
                    value={expenseConcept}
                    onChange={(ev) => setExpenseConcept(ev.target.value)}
                    placeholder="Ej. Nómina, renta oficina"
                    maxLength={255}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-exp-amount">Monto</Label>
                  <Input
                    id="fin-exp-amount"
                    type="text"
                    inputMode="decimal"
                    value={expenseAmount}
                    onChange={(ev) => setExpenseAmount(ev.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-exp-date">Fecha</Label>
                  <Input
                    id="fin-exp-date"
                    type="date"
                    value={expenseDate}
                    onChange={(ev) => setExpenseDate(ev.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fin-exp-note">Nota (opcional)</Label>
                  <Input
                    id="fin-exp-note"
                    value={expenseNote}
                    onChange={(ev) => setExpenseNote(ev.target.value)}
                    placeholder="Referencia"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                  <Button type="submit" disabled={isSavingExpense}>
                    {isSavingExpense ? 'Guardando…' : 'Registrar egreso'}
                  </Button>
                </div>
              </form>

              {manualExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No hay egresos manuales en el periodo seleccionado. Ajusta las fechas en filtros o registra uno arriba.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3 font-medium">Fecha</th>
                        <th className="p-3 font-medium">Concepto</th>
                        <th className="p-3 font-medium text-right">Monto</th>
                        <th className="p-3 font-medium hidden md:table-cell">Nota</th>
                        <th className="p-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...manualExpenses]
                        .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))
                        .map((row) => (
                          <tr key={row.id} className="border-t border-border/60">
                            <td className="p-3 whitespace-nowrap">{row.expenseDate}</td>
                            <td className="p-3">{row.concept}</td>
                            <td className="p-3 text-right font-medium text-red-600">{formatter.format(row.amount)}</td>
                            <td className="p-3 text-muted-foreground hidden md:table-cell max-w-[200px] truncate">
                              {row.note || '—'}
                            </td>
                            <td className="p-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar"
                                onClick={() => handleDeleteManualExpense(row.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grafico de tendencia + metodos de pago */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Tendencia de Ingresos, Egresos y Neto</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[300px] w-full"
                  config={{
                    income: { label: 'Ingresos', color: '#16a34a' },
                    expense: { label: 'Egresos', color: '#ef4444' },
                    net: { label: 'Neto', color: '#2563eb' },
                  }}
                >
                  <LineChart data={timeSeriesData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="income" stroke="var(--color-income)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" stroke="var(--color-expense)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-base">Metodos de pago</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-[300px] w-full"
                  config={{ amount: { label: 'Monto', color: '#2563eb' } }}
                >
                  <PieChart>
                    <Pie data={paymentTypesData} dataKey="amount" nameKey="label" innerRadius={50} outerRadius={95}>
                      {paymentTypesData.map((_, idx) => (
                        <Cell key={`cell-pay-${idx}`} fill={pieColors[idx % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend
                      content={
                        <ChartLegendContent
                          formatter={(value) =>
                            PAYMENT_TYPE_LABELS[(String(value) as 'tarjeta' | 'transferencia' | 'efectivo') || 'efectivo'] || String(value)
                          }
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Ingresos por producto */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ingresos por producto</CardTitle>
            </CardHeader>
            <CardContent>
              {productsBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Sin datos de productos en este periodo.</p>
              ) : (
                <ChartContainer
                  className="h-[280px] w-full"
                  config={{ amount: { label: 'Monto', color: '#9333ea' } }}
                >
                  <BarChart data={productsBreakdown.slice(0, 8)} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" width={130} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={6} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Rankings */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top clientes por ingresos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  topClients.map((client) => (
                    <div key={client.clientId} className="flex items-center justify-between border-b border-border/40 pb-2">
                      <div>
                        <span className="text-sm font-medium">{client.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{client.paymentsCount} pago{client.paymentsCount !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{formatter.format(client.amount)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top viajes por ingresos</CardTitle>
                <p className="text-xs text-muted-foreground font-normal">
                  Solo pagos de clientes asociados al viaje. Los egresos del módulo Viajes no afectan Finanzas.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {topTrips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  topTrips.map((trip) => (
                    <div key={trip.tripId} className="flex items-center justify-between border-b border-border/40 pb-2">
                      <div>
                        <span className="text-sm font-medium">{trip.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Ingresos</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{formatter.format(trip.income)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon }: { title: string; value: string; icon: ReactNode }) => (
  <Card className="border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      </div>
    </CardContent>
  </Card>
);
