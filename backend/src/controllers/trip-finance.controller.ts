import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth.middleware';
import { TripCompany, TripExpense, ClientPayment, Client, ClientPaymentDeletedLog, TripChangeLog } from '../models';

async function ensureUserCanAccessTrip(req: AuthRequest, tripId: string): Promise<boolean> {
  const companyId = req.user?.companyId;
  if (!companyId) return false;
  const link = await TripCompany.findOne({ where: { tripId, companyId } });
  return !!link;
}

async function logTripChange(
  tripId: string,
  userId: string,
  action: string,
  opts?: { entityType?: string; entityId?: string; fieldName?: string; oldValue?: string | null; newValue?: string | null }
): Promise<void> {
  await TripChangeLog.create({
    tripId,
    userId,
    action,
    entityType: opts?.entityType ?? null,
    entityId: opts?.entityId ?? null,
    fieldName: opts?.fieldName ?? null,
    oldValue: opts?.oldValue ?? null,
    newValue: opts?.newValue ?? null,
  });
}

export const getTripFinance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id: tripId } = req.params;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const inTrip = await ensureUserCanAccessTrip(req, tripId);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const [incomes, expenses] = await Promise.all([
      ClientPayment.findAll({
        where: { companyId, tripId },
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
        order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
      }),
      TripExpense.findAll({
        where: { companyId, tripId },
        order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
      }),
    ]);

    const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    res.json({
      summary: {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
      },
      incomes,
      expenses,
    });
  } catch (error) {
    console.error('Get trip finance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const PAYMENT_TYPES = ['tarjeta', 'transferencia', 'efectivo'] as const;

export const createTripIncome = [
  body('clientId').notEmpty().isUUID().withMessage('clientId is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('paymentDate').notEmpty().withMessage('Payment date is required').isISO8601().withMessage('Invalid date format'),
  body('paymentType').optional().isIn(PAYMENT_TYPES).withMessage('Payment type must be tarjeta, transferencia or efectivo'),
  body('referenceNumber').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).withMessage('Reference number must be up to 100 chars'),
  body('note').optional().isString(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const companyId = req.user?.companyId;
      const { id: tripId } = req.params;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!req.user?.roles.includes('super_admin')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const inTrip = await ensureUserCanAccessTrip(req, tripId);
      if (!inTrip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      const { clientId, amount, paymentDate, paymentType, referenceNumber, note } = req.body;
      const client = await Client.findOne({ where: { id: clientId, companyId } });
      if (!client) {
        res.status(400).json({ error: 'Client not found in your company' });
        return;
      }

      const payment = await ClientPayment.create({
        companyId,
        tripId,
        clientId,
        amount,
        paymentDate,
        paymentType: paymentType && PAYMENT_TYPES.includes(paymentType) ? paymentType : 'efectivo',
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
      });

      await logTripChange(tripId, req.user!.id, 'trip_income_created', {
        entityType: 'payment',
        entityId: payment.id,
        newValue: JSON.stringify({ amount: Number(payment.amount), clientId }),
      });
      const withClient = await ClientPayment.findByPk(payment.id, {
        include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
      });
      res.status(201).json(withClient || payment);
    } catch (error) {
      console.error('Create trip income error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteTripIncome = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id: tripId, paymentId } = req.params;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const inTrip = await ensureUserCanAccessTrip(req, tripId);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const payment = await ClientPayment.findOne({ where: { id: paymentId, companyId, tripId } });
    if (!payment) {
      res.status(404).json({ error: 'Income not found' });
      return;
    }

    await ClientPaymentDeletedLog.create({
      companyId,
      clientId: payment.clientId,
      paymentId: payment.id,
      tripId: payment.tripId,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentType: payment.paymentType || 'efectivo',
      referenceNumber: payment.referenceNumber || null,
      note: payment.note || null,
      deletedBy: req.user!.id,
    });
    await payment.destroy();
    await logTripChange(tripId, req.user!.id, 'trip_income_deleted', {
      entityType: 'payment',
      entityId: paymentId,
    });
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Delete trip income error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTripExpense = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('expenseDate').notEmpty().withMessage('Expense date is required').isISO8601().withMessage('Invalid date format'),
  body('category').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).withMessage('Category must be up to 100 chars'),
  body('referenceNumber').optional({ values: 'falsy' }).isString().isLength({ max: 100 }).withMessage('Reference number must be up to 100 chars'),
  body('note').optional().isString(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      const { id: tripId } = req.params;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!req.user?.roles.includes('super_admin')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const inTrip = await ensureUserCanAccessTrip(req, tripId);
      if (!inTrip) {
        res.status(404).json({ error: 'Trip not found' });
        return;
      }

      const { amount, expenseDate, category, referenceNumber, note } = req.body;
      const expense = await TripExpense.create({
        companyId,
        tripId,
        amount,
        expenseDate,
        category: category || null,
        referenceNumber: referenceNumber || null,
        note: note || null,
        createdBy: req.user!.id,
      });
      await logTripChange(tripId, req.user!.id, 'trip_expense_created', {
        entityType: 'expense',
        entityId: expense.id,
        newValue: JSON.stringify({ amount: Number(expense.amount), category: expense.category }),
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error('Create trip expense error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteTripExpense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    const { id: tripId, expenseId } = req.params;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const inTrip = await ensureUserCanAccessTrip(req, tripId);
    if (!inTrip) {
      res.status(404).json({ error: 'Trip not found' });
      return;
    }

    const expense = await TripExpense.findOne({ where: { id: expenseId, companyId, tripId } });
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    await expense.destroy();
    await logTripChange(tripId, req.user!.id, 'trip_expense_deleted', {
      entityType: 'expense',
      entityId: expenseId,
    });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete trip expense error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
