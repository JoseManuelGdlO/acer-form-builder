export type FinanceGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export interface FinanceOverviewResponse {
  meta: {
    from: string;
    to: string;
    granularity: FinanceGranularity;
    paymentType: string | null;
    productId: string | null;
    assignedUserId: string | null;
    branchId: string | null;
  };
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    netMarginPct: number;
    averageTicket: number;
    growthVsPreviousPct: number;
    previousNetProfit: number;
  };
  timeseries: Array<{
    key: string;
    label: string;
    income: number;
    expense: number;
    net: number;
  }>;
  manualExpenses: Array<{
    id: string;
    concept: string;
    amount: number;
    expenseDate: string;
    note: string | null;
  }>;
  breakdowns: {
    paymentTypes: Array<{ key: string; label: string; amount: number; count: number }>;
    products: Array<{ key: string; label: string; amount: number; count: number }>;
  };
  rankings: {
    topClients: Array<{ clientId: string; name: string; amount: number; paymentsCount: number }>;
    topTrips: Array<{ tripId: string; title: string; income: number; expense: number; net: number }>;
  };
}
