import { Router } from 'express';
import * as messagesController from '../controllers/messages.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/clients/:clientId', messagesController.getClientMessages);
router.post('/clients/:clientId', messagesController.createMessage);
router.delete('/:id', messagesController.deleteMessage);

export default router;
