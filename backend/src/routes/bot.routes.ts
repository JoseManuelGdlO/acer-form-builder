import { Router } from 'express';
import * as botController from '../controllers/bot.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

// Protected (tenant-scoped bot config)
router.get('/', authenticate, botController.getBotBehavior);

// Protected route (write - admin only)
router.put('/', authenticate, requireAnyPermission('bot_behavior.update'), botController.updateBotBehavior);

export default router;
