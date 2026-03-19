import { Router } from 'express';
import { addConv, bajaLogicaConv, updateConv, getClientConversations } from '../controllers/conversations.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', addConv);
router.patch('/:id', updateConv);
router.patch('/:phone/baja', bajaLogicaConv);
router.get('/clients/:clientId', authenticate, getClientConversations);

export default router;
