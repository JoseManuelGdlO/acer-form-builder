import { Router } from 'express';
import * as botController from '../controllers/bot.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Public route (read-only)
router.get('/', botController.getBotBehavior);

// Protected route (write - admin only)
router.put('/', authenticate, requireAdmin, botController.updateBotBehavior);

export default router;
