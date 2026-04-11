import { Router } from 'express';
import { addConv, bajaLogicaConv, updateConv, getClientConversations } from '../controllers/conversations.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, addConv);
router.patch('/:id', authenticate, updateConv);
router.patch('/:phone/baja', authenticate, bajaLogicaConv);
router.get('/clients/:clientId', authenticate, getClientConversations);

export default router;
