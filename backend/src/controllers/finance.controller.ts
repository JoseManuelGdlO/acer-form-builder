import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { ClientPayment, TripExpense, Client, Product, Trip, User } from '../models';

type Granularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'bimonthly' | 'quarterly' | 'semiannual' | 'annual';

const ALLOWED_GRANULARITIES: Granularity[] = ['hourly', 'daily', 'weekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'];
const ALLOWED_PAYMENT_TYPES = ['tarjeta', 'transferencia', 'efectivo'] as const;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type OverviewQuery = {
  from?: string;
  to?: string;
  granularity?: string;
  paymentType?: string;
  productId?: string;
  assignedUserId?: string;
  branchId?: string;
};

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

const startOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));

const endOfDayUtc = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

const addDaysUtc = (date: Date, days: number): Date => {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const parseDateOrNull = (value?: string): Date | null => {
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

const getBucket = (date: Date, granularity: Granularity): { key: string; label: string } => {
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
    return {
      key: `${year}-${pad2(month)}-${pad2(day)}`,
      label: `${pad2(day)}/${pad2(month)}/${year}`,
    };
  }

  if (granularity === 'weekly') {
    const { year: isoYear, week } = getIsoWeek(date);
    return {
      key: `${isoYear}-W${pad2(week)}`,
      label: `Sem ${week} ${isoYear}`,
    };
  }

  if (granularity === 'monthly') {
    return {
      key: `${year}-${pad2(month)}`,
      label: `${pad2(month)}/${year}`,
    };
  }

  if (granularity === 'bimonthly') {
    const bimonth = Math.ceil(month / 2);
    return {
      key: `${year}-B${bimonth}`,
      label: `Bim ${bimonth} ${year}`,
    };
  }

  if (granularity === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    return {
      key: `${year}-Q${quarter}`,
      label: `T${quarter} ${year}`,
    };
  }

  if (granularity === 'semiannual') {
    const semester = month <= 6 ? 1 : 2;
    return {
      key: `${year}-S${semester}`,
      label: `S${semester} ${year}`,
    };
  }

  return {
    key: `${year}`,
    label: `${year}`,
  };
};

const getDefaultRangeDays = (granularity: Granularity): number => {
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

const sumAmounts = (rows: Array<{ amount: number }>): number =>
  rows.reduce((acc, row) => acc + Number(row.amount || 0), 0);

export const getFinanceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Only super_admin can access finance overview' });
      return;
    }

    const query = req.query as OverviewQuery;
    const granularity = ALLOWED_GRANULARITIES.includes((query.granularity || '') as Granularity)
      ? (query.granularity as Granularity)
      : 'monthly';

    const parsedFrom = parseDateOrNull(query.from);
    const parsedTo = parseDateOrNull(query.to);
    if ((query.from && !parsedFrom) || (query.to && !parsedTo)) {
      res.status(400).json({ error: 'Invalid date format in from/to. Use YYYY-MM-DD.' });
      return;
    }

    if (query.paymentType && !ALLOWED_PAYMENT_TYPES.includes(query.paymentType as (typeof ALLOWED_PAYMENT_TYPES)[number])) {
      res.status(400).json({ error: 'Invalid paymentType. Allowed: tarjeta, transferencia, efectivo.' });
      return;
    }

    const assignedUserIdFilter = query.assignedUserId && query.assignedUserId !== '' ? String(query.assignedUserId) : null;
    if (assignedUserIdFilter && !UUID_V4_REGEX.test(assignedUserIdFilter)) {
      res.status(400).json({ error: 'Invalid assignedUserId. Use UUID.' });
      return;
    }

    const branchIdFilter = query.branchId && query.branchId !== '' ? String(query.branchId) : null;
    if (branchIdFilter && !UUID_V4_REGEX.test(branchIdFilter)) {
      res.status(400).json({ error: 'Invalid branchId. Use UUID.' });
      return;
    }

    const now = new Date();
    const toDate = endOfDayUtc(parsedTo || now);
    const fromDate = startOfDayUtc(parsedFrom || addDaysUtc(toDate, -getDefaultRangeDays(granularity)));
    if (fromDate.getTime() > toDate.getTime()) {
      res.status(400).json({ error: '"from" must be before or equal to "to".' });
      return;
    }

    const periodMs = toDate.getTime() - fromDate.getTime();
    const previousTo = endOfDayUtc(addDaysUtc(fromDate, -1));
    const previousFrom = startOfDayUtc(new Date(previousTo.getTime() - periodMs));

    const paymentWhere = {
      companyId,
      ...(granularity === 'hourly'
        ? { createdAt: { [Op.between]: [fromDate, toDate] } }
        : { paymentDate: { [Op.between]: [toIsoDate(fromDate), toIsoDate(toDate)] } }),
      ...(query.paymentType ? { paymentType: query.paymentType } : {}),
    };

    const previousPaymentWhere = {
      companyId,
      ...(granularity === 'hourly'
        ? { createdAt: { [Op.between]: [previousFrom, previousTo] } }
        : { paymentDate: { [Op.between]: [toIsoDate(previousFrom), toIsoDate(previousTo)] } }),
      ...(query.paymentType ? { paymentType: query.paymentType } : {}),
    };

    const expenseWhere = {
      companyId,
      ...(granularity === 'hourly'
        ? { createdAt: { [Op.between]: [fromDate, toDate] } }
        : { expenseDate: { [Op.between]: [toIsoDate(fromDate), toIsoDate(toDate)] } }),
    };

    const previousExpenseWhere = {
      companyId,
      ...(granularity === 'hourly'
        ? { createdAt: { [Op.between]: [previousFrom, previousTo] } }
        : { expenseDate: { [Op.between]: [toIsoDate(previousFrom), toIsoDate(previousTo)] } }),
    };

    const includeClientProduct = [
      {
        model: Client,
        as: 'client',
        attributes: ['id', 'name', 'assignedUserId'],
        include: [
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'title'],
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'branchId'],
          },
        ],
      },
      { model: Trip, as: 'trip', attributes: ['id', 'title'] },
    ];

    const includeTripWithAdvisorBranch = [
      {
        model: Trip,
        as: 'trip',
        attributes: ['id', 'title'],
        include: [
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'branchId'],
          },
        ],
      },
    ];

    const [paymentsRows, expenseRows, previousPaymentsRows, previousExpenseRows] = await Promise.all([
      ClientPayment.findAll({ where: paymentWhere, include: includeClientProduct }),
      TripExpense.findAll({ where: expenseWhere, include: includeTripWithAdvisorBranch }),
      ClientPayment.findAll({ where: previousPaymentWhere, include: includeClientProduct }),
      TripExpense.findAll({ where: previousExpenseWhere, include: includeTripWithAdvisorBranch }),
    ]);

    const payments = paymentsRows as Array<
      ClientPayment & {
        client?: (Client & { product?: Product | null; assignedUser?: User | null }) | null;
        trip?: Trip | null;
      }
    >;
    const expenses = expenseRows as Array<TripExpense & { trip?: (Trip & { assignedUser?: User | null }) | null }>;

    const productIdFilter = query.productId || null;
    let filteredPayments = productIdFilter
      ? payments.filter(
          (payment) =>
            (payment.client?.product as (Product & { id?: string }) | null | undefined)?.id === productIdFilter,
        )
      : payments;

    if (assignedUserIdFilter) {
      filteredPayments = filteredPayments.filter(
        (payment) => payment.client?.assignedUser?.id === assignedUserIdFilter,
      );
    }

    if (branchIdFilter) {
      filteredPayments = filteredPayments.filter(
        (payment) => payment.client?.assignedUser?.branchId === branchIdFilter,
      );
    }

    let filteredExpenses = expenses;
    if (assignedUserIdFilter) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.trip?.assignedUser?.id === assignedUserIdFilter,
      );
    }

    if (branchIdFilter) {
      filteredExpenses = filteredExpenses.filter(
        (expense) => expense.trip?.assignedUser?.branchId === branchIdFilter,
      );
    }

    const previousPayments = previousPaymentsRows as Array<
      ClientPayment & {
        client?: (Client & { product?: Product | null; assignedUser?: User | null }) | null;
        trip?: Trip | null;
      }
    >;
    const previousExpenses = previousExpenseRows as Array<
      TripExpense & { trip?: (Trip & { assignedUser?: User | null }) | null }
    >;

    let filteredPreviousPayments = productIdFilter
      ? previousPayments.filter(
          (payment) =>
            (payment.client?.product as (Product & { id?: string }) | null | undefined)?.id === productIdFilter,
        )
      : previousPayments;

    if (assignedUserIdFilter) {
      filteredPreviousPayments = filteredPreviousPayments.filter(
        (payment) => payment.client?.assignedUser?.id === assignedUserIdFilter,
      );
    }

    if (branchIdFilter) {
      filteredPreviousPayments = filteredPreviousPayments.filter(
        (payment) => payment.client?.assignedUser?.branchId === branchIdFilter,
      );
    }

    let filteredPreviousExpenses = previousExpenses;
    if (assignedUserIdFilter) {
      filteredPreviousExpenses = filteredPreviousExpenses.filter(
        (expense) => expense.trip?.assignedUser?.id === assignedUserIdFilter,
      );
    }

    if (branchIdFilter) {
      filteredPreviousExpenses = filteredPreviousExpenses.filter(
        (expense) => expense.trip?.assignedUser?.branchId === branchIdFilter,
      );
    }

    const totalIncome = sumAmounts(filteredPayments);
    const totalExpense = sumAmounts(filteredExpenses);
    const netProfit = totalIncome - totalExpense;
    const netMarginPct = totalIncome > 0 ? Number(((netProfit / totalIncome) * 100).toFixed(2)) : 0;
    const averageTicket = filteredPayments.length > 0 ? Number((totalIncome / filteredPayments.length).toFixed(2)) : 0;

    const previousIncome = sumAmounts(filteredPreviousPayments);
    const previousExpense = sumAmounts(filteredPreviousExpenses);
    const previousNet = previousIncome - previousExpense;
    const growthVsPreviousPct = previousNet !== 0 ? Number((((netProfit - previousNet) / Math.abs(previousNet)) * 100).toFixed(2)) : 0;

    const timeSeriesMap = new Map<string, { key: string; label: string; income: number; expense: number }>();
    const ensureBucket = (bucket: { key: string; label: string }) => {
      if (!timeSeriesMap.has(bucket.key)) {
        timeSeriesMap.set(bucket.key, { key: bucket.key, label: bucket.label, income: 0, expense: 0 });
      }
      return timeSeriesMap.get(bucket.key)!;
    };

    filteredPayments.forEach((payment) => {
      const sourceDate = granularity === 'hourly'
        ? new Date((payment as unknown as { createdAt?: Date }).createdAt || payment.paymentDate)
        : new Date(payment.paymentDate);
      const bucket = getBucket(sourceDate, granularity);
      ensureBucket(bucket).income += Number(payment.amount || 0);
    });
    filteredExpenses.forEach((expense) => {
      const sourceDate = granularity === 'hourly'
        ? new Date((expense as unknown as { createdAt?: Date }).createdAt || expense.expenseDate)
        : new Date(expense.expenseDate);
      const bucket = getBucket(sourceDate, granularity);
      ensureBucket(bucket).expense += Number(expense.amount || 0);
    });

    const timeseries = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        ...item,
        income: Number(item.income.toFixed(2)),
        expense: Number(item.expense.toFixed(2)),
        net: Number((item.income - item.expense).toFixed(2)),
      }));

    const paymentTypeMap = new Map<string, { key: string; label: string; amount: number; count: number }>();
    filteredPayments.forEach((payment) => {
      const key = payment.paymentType || 'efectivo';
      if (!paymentTypeMap.has(key)) {
        paymentTypeMap.set(key, { key, label: key, amount: 0, count: 0 });
      }
      const current = paymentTypeMap.get(key)!;
      current.amount += Number(payment.amount || 0);
      current.count += 1;
    });

    // Breakdown por producto asignado al cliente
    const productBreakdownMap = new Map<string, { key: string; label: string; amount: number; count: number }>();
    filteredPayments.forEach((payment) => {
      const prod = payment.client?.product as (Product & { id?: string; title?: string }) | null | undefined;
      const key = prod?.id || 'sin-producto';
      const label = prod?.title || 'Sin producto';
      if (!productBreakdownMap.has(key)) {
        productBreakdownMap.set(key, { key, label, amount: 0, count: 0 });
      }
      const current = productBreakdownMap.get(key)!;
      current.amount += Number(payment.amount || 0);
      current.count += 1;
    });

    const clientRankMap = new Map<string, { clientId: string; name: string; amount: number; paymentsCount: number }>();
    filteredPayments.forEach((payment) => {
      const clientId = payment.clientId;
      const name = payment.client?.name || 'Cliente sin nombre';
      if (!clientRankMap.has(clientId)) {
        clientRankMap.set(clientId, { clientId, name, amount: 0, paymentsCount: 0 });
      }
      const current = clientRankMap.get(clientId)!;
      current.amount += Number(payment.amount || 0);
      current.paymentsCount += 1;
    });

    const tripRankMap = new Map<string, { tripId: string; title: string; income: number; expense: number }>();
    filteredPayments.forEach((payment) => {
      if (!payment.tripId) return;
      const tripId = payment.tripId;
      const title = payment.trip?.title || 'Viaje sin título';
      if (!tripRankMap.has(tripId)) {
        tripRankMap.set(tripId, { tripId, title, income: 0, expense: 0 });
      }
      tripRankMap.get(tripId)!.income += Number(payment.amount || 0);
    });
    filteredExpenses.forEach((expense) => {
      const tripId = expense.tripId;
      const title = expense.trip?.title || 'Viaje sin título';
      if (!tripRankMap.has(tripId)) {
        tripRankMap.set(tripId, { tripId, title, income: 0, expense: 0 });
      }
      tripRankMap.get(tripId)!.expense += Number(expense.amount || 0);
    });

    res.json({
      meta: {
        from: toIsoDate(fromDate),
        to: toIsoDate(toDate),
        granularity,
        paymentType: query.paymentType || null,
        productId: query.productId || null,
        assignedUserId: assignedUserIdFilter || null,
        branchId: branchIdFilter || null,
      },
      kpis: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpense: Number(totalExpense.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
        netMarginPct,
        averageTicket,
        growthVsPreviousPct,
        previousNetProfit: Number(previousNet.toFixed(2)),
      },
      timeseries,
      breakdowns: {
        paymentTypes: Array.from(paymentTypeMap.values())
          .sort((a, b) => b.amount - a.amount)
          .map((x) => ({ ...x, amount: Number(x.amount.toFixed(2)) })),
        products: Array.from(productBreakdownMap.values())
          .sort((a, b) => b.amount - a.amount)
          .map((x) => ({ ...x, amount: Number(x.amount.toFixed(2)) })),
      },
      rankings: {
        topClients: Array.from(clientRankMap.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map((x) => ({ ...x, amount: Number(x.amount.toFixed(2)) })),
        topTrips: Array.from(tripRankMap.values())
          .map((x) => ({ ...x, net: Number((x.income - x.expense).toFixed(2)) }))
          .sort((a, b) => b.net - a.net)
          .slice(0, 5)
          .map((x) => ({
            ...x,
            income: Number(x.income.toFixed(2)),
            expense: Number(x.expense.toFixed(2)),
          })),
      },
    });
  } catch (error) {
    console.error('Get finance overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
