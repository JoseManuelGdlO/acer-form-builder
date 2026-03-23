import { Router } from 'express';
import * as visaStatusTemplatesController from '../controllers/visa-status-templates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, visaStatusTemplatesController.getAllVisaStatusTemplates);
router.post('/', authenticate, requireAdmin, visaStatusTemplatesController.createVisaStatusTemplate);
router.put('/:id', authenticate, requireAdmin, visaStatusTemplatesController.updateVisaStatusTemplate);
router.delete('/:id', authenticate, requireAdmin, visaStatusTemplatesController.deleteVisaStatusTemplate);

export default router;
