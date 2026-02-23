import { Router } from 'express';
import * as paymentsController from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', paymentsController.getCompanyPayments);
router.get('/clients/:clientId', paymentsController.getClientPayments);
router.post('/clients/:clientId', paymentsController.createPayment);
router.delete('/:id', paymentsController.deletePayment);

export default router;
