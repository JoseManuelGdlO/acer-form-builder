import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientPayment, Client, ClientPaymentDeletedLog, ClientAcquiredPackage, Product } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { hasPermission, canAccessClientRecord } from '../authorization/policies';

const PAYMENTS_ONLY_PRIMARY_MESSAGE =
  'Las cuentas de pago solo se gestionan en el cliente titular. Abre el perfil del titular para ver o registrar pagos.';

export const getCompanyPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'payment_logs.view')) {
      res.status(403).json({ error: 'Only super_admin can view all payment logs' });
      return;
    }

    const payments = await ClientPayment.findAll({
      where: { companyId },
      include: [
        { model: Client, as: 'client', attributes: ['id', 'name', 'parent_client_id'] },
        {
          model: ClientAcquiredPackage,
          as: 'acquiredPackage',
          required: false,
          attributes: ['id', 'product_id', 'parent_client_id'],
          include: [{ model: Product, as: 'product', attributes: ['id', 'title'], required: false }],
        },
      ],
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
    if (client.parentClientId) {
      res.status(400).json({ error: PAYMENTS_ONLY_PRIMARY_MESSAGE });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'client_payments.view') || !canAccessClientRecord(req, client)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const payments = await ClientPayment.findAll({
      where: { clientId },
      include: [
        {
          model: ClientAcquiredPackage,
          as: 'acquiredPackage',
          required: false,
          attributes: ['id', 'product_id', 'parent_client_id'],
          include: [{ model: Product, as: 'product', attributes: ['id', 'title'], required: false }],
        },
      ],
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
  body('acquiredPackageId').optional({ values: 'null' }).isUUID().withMessage('acquiredPackageId must be a UUID'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { clientId } = req.params;
      const { amount, paymentDate, paymentType, referenceNumber, note, acquiredPackageId } = req.body;
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
      if (client.parentClientId) {
        res.status(400).json({ error: PAYMENTS_ONLY_PRIMARY_MESSAGE });
        return;
      }
      if (!hasPermission(req.user?.permissions, 'client_payments.create') || !canAccessClientRecord(req, client)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      let resolvedAcquiredPackageId: string | undefined;
      if (acquiredPackageId) {
        const pkg = await ClientAcquiredPackage.findOne({
          where: { id: acquiredPackageId, companyId, parentClientId: clientId },
        });
        if (!pkg) {
          res.status(400).json({ error: 'Paquete no encontrado o no pertenece a este cliente titular' });
          return;
        }
        resolvedAcquiredPackageId = pkg.id;
      }

      const payment = await ClientPayment.create({
        companyId,
        clientId,
        acquiredPackageId: resolvedAcquiredPackageId,
        amount,
        paymentDate,
        paymentType: paymentType && PAYMENT_TYPES.includes(paymentType) ? paymentType : 'efectivo',
        referenceNumber: referenceNumber || undefined,
        note: note || undefined,
      });

      const created = await ClientPayment.findByPk(payment.id, {
        include: [
          {
            model: ClientAcquiredPackage,
            as: 'acquiredPackage',
            required: false,
            include: [{ model: Product, as: 'product', attributes: ['id', 'title'], required: false }],
          },
        ],
      });

      res.status(201).json(created ?? payment);
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
    if (client?.parentClientId) {
      res.status(400).json({ error: PAYMENTS_ONLY_PRIMARY_MESSAGE });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'client_payments.delete')) {
      res.status(403).json({ error: 'Only administrators can delete payments' });
      return;
    }

    await ClientPaymentDeletedLog.create({
      companyId,
      clientId: payment.clientId,
      paymentId: payment.id,
      tripId: payment.tripId ?? null,
      acquiredPackageId: payment.acquiredPackageId ?? null,
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
