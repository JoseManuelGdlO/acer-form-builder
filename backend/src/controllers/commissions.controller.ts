import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission } from '../authorization/policies';
import { ClientPayment, CommissionPayout, CommissionUserRate, Client, Product, User } from '../models';
import {
  COMMISSION_PERIOD_TYPES,
  CommissionPeriodType,
  getCommissionPeriodRange,
  getEffectiveCommissionPeriod,
  isPaymentSettledOnAnyCadence,
} from '../utils/commission-period';
import {
  commissionRateMapFromRows,
  paymentCommission as computePaymentCommission,
  type CommissionRateRow,
  type CommissionRateType,
} from '../utils/commission-rate';
import {
  addDaysUtc,
  endOfDayUtc,
  getBucket,
  parseDateOrNull,
  startOfDayUtc,
  sumAmounts,
  toIsoDate,
} from '../utils/reporting-period';

type PaymentWithClient = ClientPayment & {
  client?: (Client & { product?: Product | null; assignedUser?: User | null }) | null;
};

type PayoutRow = CommissionPayout & { assignedUser?: User | null };

type AdvisorStats = {
  key: string;
  label: string;
  rateType: CommissionRateType;
  ratePct: number;
  fixedAmount: number;
  earned: number;
  count: number;
  lastSaleDate: string | null;
};

const paymentInclude = [
  {
    model: Client,
    as: 'client',
    attributes: ['id', 'name', 'assignedUserId'],
    include: [
      { model: Product, as: 'product', attributes: ['id', 'title'] },
      { model: User, as: 'assignedUser', attributes: ['id', 'name'] },
    ],
  },
];

async function loadRateRows(companyId: string): Promise<CommissionRateRow[]> {
  const rows = await CommissionUserRate.findAll({
    where: { companyId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
    order: [[{ model: User, as: 'user' }, 'name', 'ASC']],
  });
  return rows.map((row) => ({
    userId: row.userId,
    name: (row as CommissionUserRate & { user?: User }).user?.name || 'Usuario',
    rateType: (row.rateType || 'percentage') as CommissionRateType,
    ratePct: Number(row.ratePct),
    fixedAmount: Number(row.fixedAmount ?? 0),
  }));
}

function paymentCommission(
  payment: PaymentWithClient,
  rateMap: ReturnType<typeof commissionRateMapFromRows>
): number {
  return computePaymentCommission(
    Number(payment.amount),
    payment.client?.assignedUserId,
    rateMap
  );
}

const parseRatePayload = (
  body: { rateType?: string; ratePct?: unknown; fixedAmount?: unknown },
  fallback?: CommissionUserRate
): { rateType: CommissionRateType; ratePct: number; fixedAmount: number } | { error: string } => {
  const rateType = (body.rateType || fallback?.rateType || 'percentage') as CommissionRateType;
  if (rateType !== 'percentage' && rateType !== 'fixed') {
    return { error: 'rateType debe ser percentage o fixed' };
  }

  if (rateType === 'fixed') {
    const fixedAmount = Number(body.fixedAmount ?? fallback?.fixedAmount ?? NaN);
    if (Number.isNaN(fixedAmount) || fixedAmount < 0) {
      return { error: 'Indica un monto fijo mayor o igual a 0' };
    }
    return { rateType, ratePct: 0, fixedAmount };
  }

  const ratePct = Number(body.ratePct ?? fallback?.ratePct ?? NaN);
  if (Number.isNaN(ratePct) || ratePct < 0 || ratePct > 100) {
    return { error: 'Indica un porcentaje entre 0 y 100' };
  }
  return { rateType, ratePct, fixedAmount: 0 };
};

async function assertCompanyUser(companyId: string, userId: string): Promise<User | null> {
  return User.findOne({ where: { id: userId, companyId } });
}

async function loadCompanyPayments(companyId: string): Promise<PaymentWithClient[]> {
  const rows = await ClientPayment.findAll({ where: { companyId }, include: paymentInclude });
  return rows as PaymentWithClient[];
}

async function loadCompanyPayouts(companyId: string): Promise<PayoutRow[]> {
  return CommissionPayout.findAll({
    where: { companyId },
    include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name'] }],
    order: [['payoutDate', 'DESC']],
  }) as Promise<PayoutRow[]>;
}

function groupPayoutsByUser(payouts: PayoutRow[]): Map<string, PayoutRow[]> {
  const map = new Map<string, PayoutRow[]>();
  payouts.forEach((payout) => {
    const list = map.get(payout.assignedUserId) || [];
    list.push(payout);
    map.set(payout.assignedUserId, list);
  });
  return map;
}

function filterUnpaidPayments(
  payments: PaymentWithClient[],
  rateMap: ReturnType<typeof commissionRateMapFromRows>,
  payoutsByUser: Map<string, PayoutRow[]>
): PaymentWithClient[] {
  return payments.filter((payment) => {
    const advisorId = payment.client?.assignedUserId;
    if (!advisorId || !rateMap.has(advisorId)) return false;
    const userPayouts = payoutsByUser.get(advisorId) || [];
    return !isPaymentSettledOnAnyCadence(
      { paymentDate: payment.paymentDate, createdAt: payment.createdAt },
      userPayouts
    );
  });
}

function buildAdvisorStats(
  rateRows: CommissionRateRow[],
  payments: PaymentWithClient[],
  rateMap: ReturnType<typeof commissionRateMapFromRows>
): AdvisorStats[] {
  const advisorMap = new Map<string, AdvisorStats>();
  rateRows.forEach((row) => {
    advisorMap.set(row.userId, {
      key: row.userId,
      label: row.name,
      rateType: row.rateType,
      ratePct: row.ratePct,
      fixedAmount: row.fixedAmount,
      earned: 0,
      count: 0,
      lastSaleDate: null,
    });
  });

  payments.forEach((payment) => {
    const advisorId = payment.client!.assignedUserId!;
    const row = advisorMap.get(advisorId);
    if (!row) return;
    row.earned += paymentCommission(payment, rateMap);
    row.count += 1;
    const saleDate = payment.paymentDate;
    if (!row.lastSaleDate || saleDate > row.lastSaleDate) {
      row.lastSaleDate = saleDate;
    }
  });

  return Array.from(advisorMap.values())
    .map((x) => ({ ...x, earned: Number(x.earned.toFixed(2)) }))
    .sort((a, b) => b.earned - a.earned);
}

function buildPeriodPreview(
  rateRows: CommissionRateRow[],
  payments: PaymentWithClient[],
  rateMap: ReturnType<typeof commissionRateMapFromRows>,
  periodFrom: string,
  periodTo: string,
  periodType: CommissionPeriodType,
  payoutsByUser: Map<string, PayoutRow[]>
) {
  const periodPayments = payments.filter((p) => {
    const advisorId = p.client?.assignedUserId;
    if (!advisorId) return false;
    const userPayouts = payoutsByUser.get(advisorId) || [];
    const effective = getEffectiveCommissionPeriod(
      p.paymentDate,
      p.createdAt,
      periodType,
      userPayouts
    );
    return effective.periodFrom === periodFrom && effective.periodTo === periodTo;
  });
  const stats = buildAdvisorStats(rateRows, periodPayments, rateMap);
  const total = stats.reduce((acc, row) => acc + row.earned, 0);
  return {
    users: stats.filter((row) => row.earned > 0),
    totalAmount: Number(total.toFixed(2)),
  };
}

function serializePayout(payout: PayoutRow) {
  return {
    id: payout.id,
    assignedUserId: payout.assignedUserId,
    advisorName: payout.assignedUser?.name || 'Usuario',
    amount: Number(Number(payout.amount).toFixed(2)),
    payoutDate: payout.payoutDate,
    concept: payout.concept,
    periodType: payout.periodType ?? null,
    periodFrom: payout.periodFrom ?? null,
    periodTo: payout.periodTo ?? null,
    periodLabel:
      payout.periodFrom && payout.periodTo
        ? `${payout.periodFrom} — ${payout.periodTo}`
        : payout.payoutDate,
    note: payout.note ?? null,
  };
}

export const listCommissionUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'commissions.view')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const users = await loadRateRows(companyId);
    res.json({ users });
  } catch (error) {
    console.error('List commission users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addCommissionUser = [
  body('userId').isUUID().withMessage('userId must be a UUID'),
  body('rateType').optional().isIn(['percentage', 'fixed']),
  body('ratePct').optional().isFloat({ min: 0, max: 100 }),
  body('fixedAmount').optional().isFloat({ min: 0 }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!hasPermission(req.user?.permissions, 'commissions.update')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { userId } = req.body as { userId: string };
      const parsedRate = parseRatePayload(req.body);
      if ('error' in parsedRate) {
        res.status(400).json({ error: parsedRate.error });
        return;
      }
      const user = await assertCompanyUser(companyId, userId);
      if (!user) {
        res.status(400).json({ error: 'Usuario no encontrado en la compañía' });
        return;
      }

      const existing = await CommissionUserRate.findOne({ where: { companyId, userId } });
      if (existing) {
        res.status(400).json({ error: 'El usuario ya está en comisiones' });
        return;
      }

      await CommissionUserRate.create({
        companyId,
        userId,
        rateType: parsedRate.rateType,
        ratePct: parsedRate.ratePct,
        fixedAmount: parsedRate.fixedAmount,
      });
      const users = await loadRateRows(companyId);
      res.status(201).json({ users });
    } catch (error) {
      console.error('Add commission user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateCommissionUserRate = [
  param('userId').isUUID(),
  body('rateType').optional().isIn(['percentage', 'fixed']),
  body('ratePct').optional().isFloat({ min: 0, max: 100 }),
  body('fixedAmount').optional().isFloat({ min: 0 }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!hasPermission(req.user?.permissions, 'commissions.update')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { userId } = req.params;
      const row = await CommissionUserRate.findOne({ where: { companyId, userId } });
      if (!row) {
        res.status(404).json({ error: 'Usuario no configurado en comisiones' });
        return;
      }

      const parsedRate = parseRatePayload(req.body, row);
      if ('error' in parsedRate) {
        res.status(400).json({ error: parsedRate.error });
        return;
      }

      row.rateType = parsedRate.rateType;
      row.ratePct = parsedRate.ratePct;
      row.fixedAmount = parsedRate.fixedAmount;
      await row.save();
      const users = await loadRateRows(companyId);
      res.json({ users });
    } catch (error) {
      console.error('Update commission user rate error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const removeCommissionUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'commissions.update')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const { userId } = req.params;
    const row = await CommissionUserRate.findOne({ where: { companyId, userId } });
    if (!row) {
      res.status(404).json({ error: 'Usuario no configurado en comisiones' });
      return;
    }
    await row.destroy();
    const users = await loadRateRows(companyId);
    res.json({ users });
  } catch (error) {
    console.error('Remove commission user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCommissionPayoutPreview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'commissions.view')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const periodType = String(req.query.periodType || 'monthly') as CommissionPeriodType;
    if (!COMMISSION_PERIOD_TYPES.includes(periodType)) {
      res.status(400).json({ error: 'periodType inválido' });
      return;
    }

    const reference = parseDateOrNull(String(req.query.referenceDate || '')) || new Date();
    const period = getCommissionPeriodRange(periodType, reference);

    const rateRows = await loadRateRows(companyId);
    if (rateRows.length === 0) {
      res.json({ period, users: [], totalAmount: 0, alreadyPaid: false });
      return;
    }

    const rateMap = commissionRateMapFromRows(rateRows);
    const [allPayments, payouts] = await Promise.all([
      loadCompanyPayments(companyId),
      loadCompanyPayouts(companyId),
    ]);
    const payoutsByUser = groupPayoutsByUser(payouts);
    const unpaidPayments = filterUnpaidPayments(allPayments, rateMap, payoutsByUser);

    const duplicate = await CommissionPayout.findOne({
      where: {
        companyId,
        periodType: period.periodType,
        periodFrom: period.periodFrom,
        periodTo: period.periodTo,
      },
    });

    const preview = buildPeriodPreview(
      rateRows,
      unpaidPayments,
      rateMap,
      period.periodFrom,
      period.periodTo,
      period.periodType,
      payoutsByUser
    );

    res.json({
      period,
      users: preview.users,
      totalAmount: preview.totalAmount,
      alreadyPaid: Boolean(duplicate),
    });
  } catch (error) {
    console.error('Get commission payout preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const payCommissionsBatch = [
  body('periodType').isIn(COMMISSION_PERIOD_TYPES),
  body('referenceDate').optional().isISO8601(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!hasPermission(req.user?.permissions, 'commissions.create')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const { periodType, referenceDate } = req.body as {
        periodType: CommissionPeriodType;
        referenceDate?: string;
      };
      const reference = parseDateOrNull(referenceDate) || new Date();
      const period = getCommissionPeriodRange(periodType, reference);

      const existing = await CommissionPayout.findOne({
        where: {
          companyId,
          periodType: period.periodType,
          periodFrom: period.periodFrom,
          periodTo: period.periodTo,
        },
      });
      if (existing) {
        res.status(400).json({ error: 'Las comisiones de este periodo ya fueron pagadas' });
        return;
      }

      const rateRows = await loadRateRows(companyId);
      if (rateRows.length === 0) {
        res.status(400).json({ error: 'No hay usuarios configurados en comisiones' });
        return;
      }

      const rateMap = commissionRateMapFromRows(rateRows);
      const [allPayments, payouts] = await Promise.all([
        loadCompanyPayments(companyId),
        loadCompanyPayouts(companyId),
      ]);
      const payoutsByUser = groupPayoutsByUser(payouts);
      const unpaidPayments = filterUnpaidPayments(allPayments, rateMap, payoutsByUser);
      const preview = buildPeriodPreview(
        rateRows,
        unpaidPayments,
        rateMap,
        period.periodFrom,
        period.periodTo,
        period.periodType,
        payoutsByUser
      );

      if (preview.users.length === 0 || preview.totalAmount <= 0) {
        res.status(400).json({ error: 'No hay comisiones pendientes en este periodo' });
        return;
      }

      const payoutDate = toIsoDate(new Date());
      const concept = `Comisión ${period.label}`;
      const createdRows: PayoutRow[] = [];

      for (const user of preview.users) {
        const row = await CommissionPayout.create({
          companyId,
          assignedUserId: user.key,
          amount: user.earned,
          payoutDate,
          concept,
          periodType: period.periodType,
          periodFrom: period.periodFrom,
          periodTo: period.periodTo,
          note: null,
          createdBy: req.user!.id,
        });
        const withUser = await CommissionPayout.findByPk(row.id, {
          include: [{ model: User, as: 'assignedUser', attributes: ['id', 'name'] }],
        });
        if (withUser) createdRows.push(withUser as PayoutRow);
      }

      res.status(201).json({
        period,
        payouts: createdRows.map(serializePayout),
        totalAmount: preview.totalAmount,
      });
    } catch (error) {
      console.error('Pay commissions batch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const listCommissionPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'commissions.view')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const payouts = await loadCompanyPayouts(companyId);
    res.json({ payouts: payouts.map(serializePayout) });
  } catch (error) {
    console.error('List commission payouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCommissionsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'commissions.view')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const rateRows = await loadRateRows(companyId);
    const rateMap = commissionRateMapFromRows(rateRows);

    if (rateRows.length === 0) {
      res.json({
        meta: { configuredUsers: rateRows },
        kpis: {
          totalEarned: 0,
          totalPending: 0,
          averageCommission: 0,
          paymentsBaseAmount: 0,
        },
        timeseries: [],
        breakdowns: { advisors: [] },
        rankings: { topAdvisors: [], topClients: [] },
        paidPayouts: [],
      });
      return;
    }

    const now = new Date();
    const toDate = endOfDayUtc(now);
    const fromDate = startOfDayUtc(addDaysUtc(toDate, -365));
    const previousTo = endOfDayUtc(addDaysUtc(fromDate, -1));
    const previousFrom = startOfDayUtc(addDaysUtc(previousTo, -365));

    const [allPayments, yearPaymentsRows, prevPaymentsRows, payouts] = await Promise.all([
      loadCompanyPayments(companyId),
      ClientPayment.findAll({
        where: {
          companyId,
          paymentDate: { [Op.between]: [toIsoDate(fromDate), toIsoDate(toDate)] },
        },
        include: paymentInclude,
      }),
      ClientPayment.findAll({
        where: {
          companyId,
          paymentDate: { [Op.between]: [toIsoDate(previousFrom), toIsoDate(previousTo)] },
        },
        include: paymentInclude,
      }),
      loadCompanyPayouts(companyId),
    ]);

    const eligible = (rows: PaymentWithClient[]) =>
      rows.filter((p) => p.client?.assignedUserId && rateMap.has(p.client.assignedUserId));

    const allEligible = eligible(allPayments);
    const yearPayments = eligible(yearPaymentsRows as PaymentWithClient[]);
    const prevPayments = eligible(prevPaymentsRows as PaymentWithClient[]);

    const payoutsByUser = groupPayoutsByUser(payouts);
    const unpaidPayments = filterUnpaidPayments(allPayments, rateMap, payoutsByUser);
    const unpaidAdvisors = buildAdvisorStats(rateRows, unpaidPayments, rateMap);

    const sumEarned = (payments: PaymentWithClient[]) =>
      payments.reduce((acc, p) => acc + paymentCommission(p, rateMap), 0);

    const totalPending = sumEarned(unpaidPayments);
    const totalEarnedAllTime = sumEarned(allEligible);
    const paymentsBaseAmount = sumAmounts(unpaidPayments);
    const averageCommission =
      unpaidPayments.length > 0 ? Number((totalPending / unpaidPayments.length).toFixed(2)) : 0;

    const yearEarned = sumEarned(yearPayments);
    const prevEarned = sumEarned(prevPayments);
    const growthVsPreviousPct =
      prevEarned !== 0 ? Number((((yearEarned - prevEarned) / Math.abs(prevEarned)) * 100).toFixed(2)) : 0;

    const timeSeriesMap = new Map<string, { key: string; label: string; earned: number }>();
    const ensureBucket = (bucket: { key: string; label: string }) => {
      if (!timeSeriesMap.has(bucket.key)) {
        timeSeriesMap.set(bucket.key, { key: bucket.key, label: bucket.label, earned: 0 });
      }
      return timeSeriesMap.get(bucket.key)!;
    };

    yearPayments.forEach((payment) => {
      const bucket = getBucket(new Date(payment.paymentDate), 'monthly');
      ensureBucket(bucket).earned += paymentCommission(payment, rateMap);
    });

    const timeseries = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({ ...item, earned: Number(item.earned.toFixed(2)) }));

    const clientRankMap = new Map<
      string,
      { clientId: string; name: string; commissionAmount: number; paymentsCount: number }
    >();
    unpaidPayments.forEach((payment) => {
      const clientId = payment.clientId;
      const name = payment.client?.name || 'Cliente sin nombre';
      if (!clientRankMap.has(clientId)) {
        clientRankMap.set(clientId, { clientId, name, commissionAmount: 0, paymentsCount: 0 });
      }
      const row = clientRankMap.get(clientId)!;
      row.commissionAmount += paymentCommission(payment, rateMap);
      row.paymentsCount += 1;
    });

    res.json({
      meta: { configuredUsers: rateRows },
      kpis: {
        totalEarned: Number(totalEarnedAllTime.toFixed(2)),
        totalPending: Number(totalPending.toFixed(2)),
        averageCommission,
        paymentsBaseAmount: Number(paymentsBaseAmount.toFixed(2)),
        growthVsPreviousPct,
        previousEarned: Number(prevEarned.toFixed(2)),
      },
      timeseries,
      breakdowns: { advisors: unpaidAdvisors },
      rankings: {
        topAdvisors: unpaidAdvisors.map((x) => ({
          userId: x.key,
          name: x.label,
          rateType: x.rateType,
          ratePct: x.ratePct,
          fixedAmount: x.fixedAmount,
          earned: x.earned,
          paymentsCount: x.count,
        })),
        topClients: Array.from(clientRankMap.values())
          .map((x) => ({ ...x, commissionAmount: Number(x.commissionAmount.toFixed(2)) }))
          .sort((a, b) => b.commissionAmount - a.commissionAmount)
          .slice(0, 5),
      },
      paidPayouts: payouts.map(serializePayout),
    });
  } catch (error) {
    console.error('Get commissions overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
