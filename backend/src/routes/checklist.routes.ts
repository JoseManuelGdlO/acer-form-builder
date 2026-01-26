import { Router } from 'express';
import * as checklistController from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Templates (admin only)
router.get('/templates', checklistController.getAllTemplates);
router.post('/templates', authenticate, requireAdmin, checklistController.createTemplate);
router.put('/templates/:id', authenticate, requireAdmin, checklistController.updateTemplate);
router.delete('/templates/:id', authenticate, requireAdmin, checklistController.deleteTemplate);

// Client checklist items
router.get('/clients/:clientId', authenticate, checklistController.getClientChecklist);
router.put('/clients/:clientId/items/:itemId', authenticate, checklistController.updateChecklistItem);

export default router;
