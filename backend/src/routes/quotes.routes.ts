import { Router } from 'express';
import * as quotesController from '../controllers/quotes.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission('quotes.view'), quotesController.listQuotes);
router.get('/template', requireAnyPermission('quotes.view'), quotesController.getQuoteTemplate);
router.put('/template', requireAnyPermission('quotes.update'), quotesController.updateQuoteTemplate);
router.get('/template/pdf', requireAnyPermission('quotes.view'), quotesController.downloadQuoteTemplatePdf);
router.get('/:id/pdf', requireAnyPermission('quotes.view'), quotesController.downloadQuotePdf);
router.get('/:id', requireAnyPermission('quotes.view'), quotesController.getQuoteById);
router.post('/', requireAnyPermission('quotes.create'), quotesController.createQuote);
router.put('/:id', requireAnyPermission('quotes.update'), quotesController.updateQuote);
router.patch('/:id/status', requireAnyPermission('quotes.update'), quotesController.updateQuoteStatus);
router.post('/:id/link', requireAnyPermission('quotes.update'), quotesController.linkQuote);
router.post('/:id/events', requireAnyPermission('quotes.update'), quotesController.addQuoteEvent);
router.delete('/:id', requireAnyPermission('quotes.delete'), quotesController.deleteQuote);

export default router;
