import { Router } from 'express';
import * as companiesController from '../controllers/companies.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/for-trip-share', authenticate, companiesController.getCompaniesForTripShare);
router.get('/me', authenticate, companiesController.getMyCompany);
router.patch('/me', authenticate, companiesController.updateMyCompany);

export default router;
