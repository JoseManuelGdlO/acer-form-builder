import { Router } from 'express';
import * as faqsController from '../controllers/faqs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.get('/', authenticate, faqsController.getAllFAQs);
router.get('/:id', authenticate, faqsController.getFAQById);

// Protected routes (write - admin only)
router.post('/', authenticate, requireAnyPermission('faqs.create'), faqsController.createFAQ);
router.put('/:id', authenticate, requireAnyPermission('faqs.update'), faqsController.updateFAQ);
router.delete('/:id', authenticate, requireAnyPermission('faqs.delete'), faqsController.deleteFAQ);

export default router;
