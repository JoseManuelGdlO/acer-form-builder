import { Router } from 'express';
import * as formsController from '../controllers/forms.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Public routes (read-only)
router.get('/', formsController.getAllForms);
router.get('/:id', formsController.getFormById);

// Protected routes (write - admin only)
router.post('/', authenticate, requireAdmin, formsController.createForm);
router.put('/:id', authenticate, requireAdmin, formsController.updateForm);
router.delete('/:id', authenticate, requireAdmin, formsController.deleteForm);

export default router;
