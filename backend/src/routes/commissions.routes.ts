import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as commissionsController from '../controllers/commissions.controller';

const router = Router();

router.use(authenticate);

router.get('/users', commissionsController.listCommissionUsers);
router.post('/users', commissionsController.addCommissionUser);
router.put('/users/:userId', commissionsController.updateCommissionUserRate);
router.delete('/users/:userId', commissionsController.removeCommissionUser);
router.get('/payout-preview', commissionsController.getCommissionPayoutPreview);
router.post('/payouts', commissionsController.payCommissionsBatch);
router.get('/payouts', commissionsController.listCommissionPayouts);
router.get('/overview', commissionsController.getCommissionsOverview);

export default router;
