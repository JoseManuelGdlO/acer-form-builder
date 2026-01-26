import { Router } from 'express';
import * as faqsController from '../controllers/faqs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Public routes (read-only)
router.get('/', faqsController.getAllFAQs);
router.get('/:id', faqsController.getFAQById);

// Protected routes (write - admin only)
router.post('/', authenticate, requireAdmin, faqsController.createFAQ);
router.put('/:id', authenticate, requireAdmin, faqsController.updateFAQ);
router.delete('/:id', authenticate, requireAdmin, faqsController.deleteFAQ);

export default router;
