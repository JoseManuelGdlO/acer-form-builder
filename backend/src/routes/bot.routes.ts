import { Router } from 'express';
import * as botController from '../controllers/bot.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Protected (tenant-scoped bot config)
router.get('/', authenticate, botController.getBotBehavior);

// Protected route (write - admin only)
router.put('/', authenticate, requireAdmin, botController.updateBotBehavior);

export default router;
