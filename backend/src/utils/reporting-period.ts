export type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

export const ALLOWED_GRANULARITIES: Granularity[] = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semiannual',
  'annual',
];

export const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const startOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

export const endOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

export const addDaysUtc = (date: Date, days: number): Date => {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

export const parseDateOrNull = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

const getIsoWeek = (date: Date): { year: number; week: number } => {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
  return { year: target.getUTCFullYear(), week };
};

export const getBucket = (date: Date, granularity: Granularity): { key: string; label: string } => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  if (granularity === 'hourly') {
    return {
      key: `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}`,
      label: `${pad2(day)}/${pad2(month)} ${pad2(hour)}:00`,
    };
  }
  if (granularity === 'daily') {
    return { key: `${year}-${pad2(month)}-${pad2(day)}`, label: `${pad2(day)}/${pad2(month)}/${year}` };
  }
  if (granularity === 'weekly') {
    const { year: isoYear, week } = getIsoWeek(date);
    return { key: `${isoYear}-W${pad2(week)}`, label: `Sem ${week} ${isoYear}` };
  }
  if (granularity === 'monthly') {
    return { key: `${year}-${pad2(month)}`, label: `${pad2(month)}/${year}` };
  }
  if (granularity === 'bimonthly') {
    const bimonth = Math.ceil(month / 2);
    return { key: `${year}-B${bimonth}`, label: `Bim ${bimonth} ${year}` };
  }
  if (granularity === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    return { key: `${year}-Q${quarter}`, label: `T${quarter} ${year}` };
  }
  if (granularity === 'semiannual') {
    const semester = month <= 6 ? 1 : 2;
    return { key: `${year}-S${semester}`, label: `S${semester} ${year}` };
  }
  return { key: `${year}`, label: `${year}` };
};

export const getDefaultRangeDays = (granularity: Granularity): number => {
  switch (granularity) {
    case 'hourly':
      return 3;
    case 'daily':
      return 31;
    case 'weekly':
      return 56;
    case 'monthly':
      return 365;
    case 'bimonthly':
      return 365;
    case 'quarterly':
      return 730;
    case 'semiannual':
      return 1095;
    case 'annual':
      return 1825;
    default:
      return 365;
  }
};

export const sumAmounts = (rows: Array<{ amount: number }>): number =>
  rows.reduce((acc, row) => acc + Number(row.amount || 0), 0);
