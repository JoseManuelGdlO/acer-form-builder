import { Router } from 'express';
import * as visaStatusTemplatesController from '../controllers/visa-status-templates.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.get('/', authenticate, visaStatusTemplatesController.getAllVisaStatusTemplates);
router.post('/', authenticate, requireAnyPermission('visa_status_templates.create'), visaStatusTemplatesController.createVisaStatusTemplate);
router.put('/:id', authenticate, requireAnyPermission('visa_status_templates.update'), visaStatusTemplatesController.updateVisaStatusTemplate);
router.delete('/:id', authenticate, requireAnyPermission('visa_status_templates.delete'), visaStatusTemplatesController.deleteVisaStatusTemplate);

export default router;
