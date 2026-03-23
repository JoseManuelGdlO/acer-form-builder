import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientPayment, Client, ClientPaymentDeletedLog } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getCompanyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!req.user?.roles.includes('super_admin')) {
      res.status(403).json({ error: 'Only super_admin can view all payment logs' });
      return;
    }

    const payments = await ClientPayment.findAll({
      where: { companyId },
      include: [{ model: Client, as: 'client', attributes: ['id', 'name'] }],
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
    });

    res.json(payments);
  } catch (error) {
    console.error('Get company payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const payments = await ClientPayment.findAll({
      where: { clientId },
      order: [['payment_date', 'DESC'], ['created_at', 'DESC']],
    });

    res.json(payments);
  } catch (error) {
    console.error('Get client payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const PAYMENT_TYPES = ['tarjeta', 'transferencia', 'efectivo'] as const;

export const createPayment = [
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

      const { clientId } = req.params;
      const { amount, paymentDate, paymentType, referenceNumber, note } = req.body;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const client = await Client.findOne({ where: { id: clientId, companyId } });
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const payment = await ClientPayment.create({
        companyId,
        clientId,
        amount,
        paymentDate,
        paymentType: paymentType && PAYMENT_TYPES.includes(paymentType) ? paymentType : 'efectivo',
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
      });

      res.status(201).json(payment);
    } catch (error) {
      console.error('Create payment error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deletePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const payment = await ClientPayment.findOne({ where: { id, companyId } });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    const client = await Client.findOne({ where: { id: payment.clientId, companyId } });
    if (!req.user?.roles.includes('super_admin') && client && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await ClientPaymentDeletedLog.create({
      companyId,
      clientId: payment.clientId,
      paymentId: payment.id,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentType: payment.paymentType || 'efectivo',
      referenceNumber: payment.referenceNumber || null,
      note: payment.note || null,
      deletedBy: req.user?.id,
    });
    await payment.destroy();
    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
