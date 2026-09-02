export type CommissionRateType = 'percentage' | 'fixed';

export type CommissionPeriodType = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export interface CommissionUserRate {
  userId: string;
  name: string;
  rateType: CommissionRateType;
  ratePct: number;
  fixedAmount: number;
}

export interface CommissionPeriodInfo {
  periodType: CommissionPeriodType;
  periodFrom: string;
  periodTo: string;
  label: string;
  periodKey: string;
}

export interface CommissionPayoutRow {
  id: string;
  assignedUserId: string;
  advisorName: string;
  amount: number;
  payoutDate: string;
  concept: string;
  periodType: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  periodLabel: string;
  note: string | null;
}

export interface CommissionPayoutPreviewResponse {
  period: CommissionPeriodInfo;
  users: Array<{
    key: string;
    label: string;
    rateType: CommissionRateType;
    ratePct: number;
    fixedAmount: number;
    earned: number;
    count: number;
    lastSaleDate: string | null;
  }>;
  totalAmount: number;
  alreadyPaid: boolean;
}

export interface CommissionsOverviewResponse {
  meta: {
    configuredUsers: CommissionUserRate[];
  };
  kpis: {
    totalEarned: number;
    totalPending: number;
    averageCommission: number;
    paymentsBaseAmount: number;
    growthVsPreviousPct?: number;
    previousEarned?: number;
  };
  timeseries: Array<{
    key: string;
    label: string;
    earned: number;
  }>;
  breakdowns: {
    advisors: Array<{
      key: string;
      label: string;
      rateType: CommissionRateType;
      ratePct: number;
      fixedAmount: number;
      earned: number;
      count: number;
      lastSaleDate: string | null;
    }>;
  };
  rankings: {
    topAdvisors: Array<{
      userId: string;
      name: string;
      rateType: CommissionRateType;
      ratePct: number;
      fixedAmount: number;
      earned: number;
      paymentsCount: number;
    }>;
    topClients: Array<{ clientId: string; name: string; commissionAmount: number; paymentsCount: number }>;
  };
  paidPayouts: CommissionPayoutRow[];
}

export interface CommissionUsersResponse {
  users: CommissionUserRate[];
}

export interface PayCommissionsBatchResponse {
  period: CommissionPeriodInfo;
  payouts: CommissionPayoutRow[];
  totalAmount: number;
}
