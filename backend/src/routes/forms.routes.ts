import { Router } from 'express';
import * as formsController from '../controllers/forms.controller';
import * as formSessionsController from '../controllers/form-sessions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Public routes (read-only)
router.get('/', formsController.getAllForms);
// Form sessions (public get/update for respondents; create is protected)
router.get('/:id/sessions/:sessionId', formSessionsController.getFormSessionProgress);
router.patch('/:id/sessions/:sessionId', ...formSessionsController.updateFormSessionProgress);
router.post('/:id/sessions/:sessionId/complete', formSessionsController.completeFormSession);
router.get('/:id', formsController.getFormById);

// Protected routes (write - admin only)
router.post('/', authenticate, requireAdmin, formsController.createForm);
router.post('/:id/sessions', authenticate, requireAdmin, formSessionsController.createFormSession);
router.put('/:id', authenticate, requireAdmin, formsController.updateForm);
router.delete('/:id', authenticate, requireAdmin, formsController.deleteForm);

export default router;
