import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as tripFinanceController from '../controllers/trip-finance.controller';

const router = Router();

router.use(authenticate);

router.get('/:id/finance', tripFinanceController.getTripFinance);
router.post('/:id/finance/incomes', tripFinanceController.createTripIncome);
router.delete('/:id/finance/incomes/:paymentId', tripFinanceController.deleteTripIncome);
router.post('/:id/finance/expenses', tripFinanceController.createTripExpense);
router.delete('/:id/finance/expenses/:expenseId', tripFinanceController.deleteTripExpense);

export default router;
