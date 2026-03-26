import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as financeController from '../controllers/finance.controller';

const router = Router();

router.use(authenticate);

router.get('/overview', financeController.getFinanceOverview);

export default router;
