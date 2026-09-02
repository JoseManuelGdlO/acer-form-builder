import { toIsoDate } from './reporting-period';

export type PayoutPeriodRef = {
  periodType?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  payoutDate?: string;
  createdAt?: Date | string;
};

export type CommissionPeriodType = 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export const COMMISSION_PERIOD_TYPES: CommissionPeriodType[] = [
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

export type CommissionPeriodRange = {
  periodType: CommissionPeriodType;
  periodFrom: string;
  periodTo: string;
  label: string;
  periodKey: string;
};

export const getCommissionPeriodRange = (
  periodType: CommissionPeriodType,
  referenceDate: Date
): CommissionPeriodRange => {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  if (periodType === 'monthly') {
    const from = new Date(Date.UTC(year, month, 1));
    const to = new Date(Date.UTC(year, month + 1, 0));
    return {
      periodType,
      periodFrom: toIsoDate(from),
      periodTo: toIsoDate(to),
      label: `${pad2(month + 1)}/${year}`,
      periodKey: `${year}-${pad2(month + 1)}`,
    };
  }

  if (periodType === 'bimonthly') {
    const bimonthIndex = Math.floor(month / 2);
    const startMonth = bimonthIndex * 2;
    const from = new Date(Date.UTC(year, startMonth, 1));
    const to = new Date(Date.UTC(year, startMonth + 2, 0));
    return {
      periodType,
      periodFrom: toIsoDate(from),
      periodTo: toIsoDate(to),
      label: `Bimestre ${bimonthIndex + 1} ${year}`,
      periodKey: `${year}-B${bimonthIndex + 1}`,
    };
  }

  if (periodType === 'quarterly') {
    const quarter = Math.floor(month / 3);
    const startMonth = quarter * 3;
    const from = new Date(Date.UTC(year, startMonth, 1));
    const to = new Date(Date.UTC(year, startMonth + 3, 0));
    return {
      periodType,
      periodFrom: toIsoDate(from),
      periodTo: toIsoDate(to),
      label: `Trimestre ${quarter + 1} ${year}`,
      periodKey: `${year}-Q${quarter + 1}`,
    };
  }

  if (periodType === 'semiannual') {
    const semester = Math.floor(month / 6);
    const startMonth = semester * 6;
    const from = new Date(Date.UTC(year, startMonth, 1));
    const to = new Date(Date.UTC(year, startMonth + 6, 0));
    return {
      periodType,
      periodFrom: toIsoDate(from),
      periodTo: toIsoDate(to),
      label: `Semestre ${semester + 1} ${year}`,
      periodKey: `${year}-S${semester + 1}`,
    };
  }

  const from = new Date(Date.UTC(year, 0, 1));
  const to = new Date(Date.UTC(year, 11, 31));
  return {
    periodType,
    periodFrom: toIsoDate(from),
    periodTo: toIsoDate(to),
    label: `Año ${year}`,
    periodKey: `${year}`,
  };
};

export const parseDateOnlyUtc = (value: Date | string): Date => {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const getNextCommissionPeriodRange = (
  periodType: CommissionPeriodType,
  current: CommissionPeriodRange
): CommissionPeriodRange => {
  const end = parseDateOnlyUtc(current.periodTo);
  const nextRef = new Date(end.getTime() + 86400000);
  return getCommissionPeriodRange(periodType, nextRef);
};

/**
 * Periodo en el que cuenta una comisión. Si el periodo natural ya se liquidó
 * antes de registrar el pago, se traslada al siguiente periodo del mismo tipo.
 */
export function getEffectiveCommissionPeriod(
  paymentDate: string,
  paymentCreatedAt: Date | string,
  periodType: CommissionPeriodType,
  userPayouts: PayoutPeriodRef[]
): CommissionPeriodRange {
  const paymentCreated = new Date(paymentCreatedAt).getTime();
  const cadencePayouts = userPayouts.filter((p) => (p.periodType || 'monthly') === periodType);
  let period = getCommissionPeriodRange(periodType, parseDateOnlyUtc(paymentDate));

  for (let guard = 0; guard < 24; guard += 1) {
    const closedBeforePayment = cadencePayouts.find(
      (p) =>
        p.periodFrom === period.periodFrom &&
        p.periodTo === period.periodTo &&
        p.createdAt &&
        new Date(p.createdAt).getTime() < paymentCreated
    );
    if (!closedBeforePayment) break;
    period = getNextCommissionPeriodRange(periodType, period);
  }
  return period;
}

function isLegacyPaymentSettled(
  payment: { paymentDate: string; createdAt?: Date | string },
  payout: PayoutPeriodRef
): boolean {
  const from = payout.periodFrom || payout.payoutDate;
  const to = payout.periodTo || payout.payoutDate;
  if (!from || !to) return false;
  if (payment.paymentDate < from || payment.paymentDate > to) return false;
  const paymentCreated = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
  const payoutCreated = payout.createdAt ? new Date(payout.createdAt).getTime() : Infinity;
  return paymentCreated <= payoutCreated;
}

export function isPaymentCommissionSettled(
  payment: { paymentDate: string; createdAt?: Date | string },
  userPayouts: PayoutPeriodRef[],
  periodType: CommissionPeriodType
): boolean {
  const paymentCreated = payment.createdAt ? new Date(payment.createdAt).getTime() : 0;
  const cadencePayouts = userPayouts.filter((p) => (p.periodType || 'monthly') === periodType);
  const effective = getEffectiveCommissionPeriod(
    payment.paymentDate,
    payment.createdAt || new Date(0),
    periodType,
    cadencePayouts
  );

  return cadencePayouts.some((payout) => {
    if (!payout.periodFrom || !payout.periodTo || !payout.createdAt) return false;
    if (payout.periodFrom !== effective.periodFrom || payout.periodTo !== effective.periodTo) return false;
    return paymentCreated <= new Date(payout.createdAt).getTime();
  });
}

/** True si el pago ya fue cubierto por alguna liquidación (cualquier cadencia configurada). */
export function isPaymentSettledOnAnyCadence(
  payment: { paymentDate: string; createdAt?: Date | string },
  userPayouts: PayoutPeriodRef[]
): boolean {
  if (userPayouts.length === 0) return false;

  const modernPayouts = userPayouts.filter((p) => p.periodFrom && p.periodTo);
  if (modernPayouts.length === 0) {
    return userPayouts.some((payout) => isLegacyPaymentSettled(payment, payout));
  }

  const periodTypes = new Set<CommissionPeriodType>();
  modernPayouts.forEach((p) => periodTypes.add((p.periodType || 'monthly') as CommissionPeriodType));

  for (const periodType of periodTypes) {
    if (isPaymentCommissionSettled(payment, userPayouts, periodType)) return true;
  }
  return false;
}

/** @deprecated Use isPaymentSettledOnAnyCadence with payment createdAt */
export const isPaymentDateSettled = (
  paymentDate: string,
  payouts: PayoutPeriodRef[]
): boolean => isPaymentSettledOnAnyCadence({ paymentDate }, payouts);
