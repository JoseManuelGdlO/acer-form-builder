export type CommissionRateType = 'percentage' | 'fixed';

export type CommissionRateConfig = {
  rateType: CommissionRateType;
  ratePct: number;
  fixedAmount: number;
};

export type CommissionRateRow = CommissionRateConfig & {
  userId: string;
  name: string;
};

export const commissionFromPayment = (paymentAmount: number, config: CommissionRateConfig): number => {
  if (config.rateType === 'fixed') {
    return Number(Number(config.fixedAmount || 0).toFixed(2));
  }
  return Number((Number(paymentAmount || 0) * (config.ratePct / 100)).toFixed(2));
};

export const commissionRateMapFromRows = (
  rows: Array<{ userId: string; rateType: CommissionRateType; ratePct: number; fixedAmount: number }>
): Map<string, CommissionRateConfig> =>
  new Map(
    rows.map((row) => [
      row.userId,
      {
        rateType: row.rateType,
        ratePct: Number(row.ratePct),
        fixedAmount: Number(row.fixedAmount),
      },
    ])
  );

export const paymentCommission = (
  paymentAmount: number,
  advisorId: string | null | undefined,
  rateMap: Map<string, CommissionRateConfig>
): number => {
  if (!advisorId || !rateMap.has(advisorId)) return 0;
  return commissionFromPayment(paymentAmount, rateMap.get(advisorId)!);
};
