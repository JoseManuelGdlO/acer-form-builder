import { Router } from 'express';
import { addConv } from '../controllers/conversations.controller';

const router = Router();

router.post('/', addConv);

export default router;
