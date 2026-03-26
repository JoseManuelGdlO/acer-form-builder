import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Loader2, TrendingUp, Wallet, Landmark, Percent, Receipt, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PAYMENT_TYPE_LABELS } from '@/types/form';
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
  const [products, setProducts] = useState<Array<{ id: string; title: string }>>([]);

  // Load product list for the product filter dropdown
  useEffect(() => {
    if (!token) return;
    api.getProducts(token).then((list) => {
      const mapped = (Array.isArray(list) ? list : []).map((p: any) => ({ id: p.id, title: p.title }));
      setProducts(mapped);
    }).catch(() => setProducts([]));
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

      const response = await api.getFinanceOverview(
        {
          granularity: g,
          from: f || undefined,
          to: t || undefined,
          paymentType: (pt as 'tarjeta' | 'transferencia' | 'efectivo') || undefined,
          productId: pid || undefined,
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
    setGranularity(DEFAULT_GRANULARITY);
    loadOverview({
      granularity: DEFAULT_GRANULARITY,
      from: '',
      to: '',
      paymentType: '',
      productId: '',
    });
  };

  const kpis = data?.kpis;
  const timeSeriesData = data?.timeseries ?? [];
  const paymentTypesData = data?.breakdowns.paymentTypes ?? [];
  const productsBreakdown = data?.breakdowns.products ?? [];
  const topClients = data?.rankings.topClients ?? [];
  const topTrips = data?.rankings.topTrips ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Finanzas 360</h1>
        <p className="text-muted-foreground text-sm">Ganancia neta, tendencias y estadisticas operativas de la empresa.</p>
      </div>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
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
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
            <StatCard title="Egresos" value={formatter.format(kpis.totalExpense)} icon={<Landmark className="w-5 h-5" />} />
            <StatCard title="Margen Neto" value={`${kpis.netMarginPct}%`} icon={<Percent className="w-5 h-5" />} />
            <StatCard title="Ticket Promedio" value={formatter.format(kpis.averageTicket)} icon={<Receipt className="w-5 h-5" />} />
            <StatCard title="Crecimiento" value={`${kpis.growthVsPreviousPct}%`} icon={<TrendingUp className="w-5 h-5" />} />
          </div>

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
                <CardTitle className="text-base">Top viajes por utilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topTrips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos</p>
                ) : (
                  topTrips.map((trip) => (
                    <div key={trip.tripId} className="flex items-center justify-between border-b border-border/40 pb-2">
                      <div>
                        <span className="text-sm font-medium">{trip.title}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          Ing: {formatter.format(trip.income)} / Egr: {formatter.format(trip.expense)}
                        </span>
                      </div>
                      <span className={`text-sm font-semibold ${trip.net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatter.format(trip.net)}
                      </span>
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
