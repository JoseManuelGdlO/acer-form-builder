import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/permanent-token', authenticate, authController.getPermanentToken);

export default router;
