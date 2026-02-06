import { Router } from 'express';
import { addConv, bajaLogicaConv, updateConv } from '../controllers/conversations.controller';

const router = Router();

router.post('/', addConv);
router.patch('/:id', updateConv);
router.patch('/:phone/baja', bajaLogicaConv);

export default router;
