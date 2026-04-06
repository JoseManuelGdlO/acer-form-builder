import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as financeController from '../controllers/finance.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', financeController.getFinanceOverview);
router.post('/expenses', financeController.createFinanceExpense);
router.delete('/expenses/:id', financeController.deleteFinanceExpense);

export default router;
