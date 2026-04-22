import { Router } from 'express';
import * as formsController from '../controllers/forms.controller';
import * as formSessionsController from '../controllers/form-sessions.controller';
import * as submissionsController from '../controllers/submissions.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

// Protected list (tenant-scoped)
router.get('/', authenticate, formsController.getAllForms);
router.post('/:id/duplicate', authenticate, formsController.duplicateForm);
router.get('/sessions/client/:clientId', authenticate, formSessionsController.getClientFormSessions);
// Form sessions (public get/update for respondents; create is protected)
router.get('/:id/sessions/:sessionId', formSessionsController.getFormSessionProgress);
router.patch('/:id/sessions/:sessionId', ...formSessionsController.updateFormSessionProgress);
router.post('/:id/sessions/:sessionId/complete', formSessionsController.completeFormSession);
// Public routes for form session submissions
router.get('/:id/sessions/:sessionId/submission', submissionsController.getSubmissionBySession);
router.post('/:id/sessions/:sessionId/submission', ...submissionsController.createSubmissionFromSession);
router.patch('/:id/sessions/:sessionId/submission', ...submissionsController.updateSubmissionFromSession);
router.get('/:id', formsController.getFormById);

// Protected routes (write - admin only)
router.post('/', authenticate, requireAnyPermission('forms.create'), formsController.createForm);
router.post('/:id/sessions', authenticate, formSessionsController.createFormSession);
router.put('/:id', authenticate, requireAnyPermission('forms.update'), formsController.updateForm);
router.delete('/:id', authenticate, requireAnyPermission('forms.delete'), formsController.deleteForm);

export default router;
