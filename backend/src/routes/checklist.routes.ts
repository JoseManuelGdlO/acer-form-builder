import { Router } from 'express';
import * as checklistController from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.get('/templates', authenticate, checklistController.getAllTemplates);
router.post('/templates', authenticate, requireAnyPermission('checklist_templates.create'), checklistController.createTemplate);
router.put('/templates/:id', authenticate, requireAnyPermission('checklist_templates.update'), checklistController.updateTemplate);
router.delete('/templates/:id', authenticate, requireAnyPermission('checklist_templates.delete'), checklistController.deleteTemplate);

// Client checklist items
router.get('/clients/:clientId', authenticate, checklistController.getClientChecklist);
router.put('/clients/:clientId/items/:itemId', authenticate, checklistController.updateChecklistItem);

export default router;
