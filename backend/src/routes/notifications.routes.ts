import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

router.get('/vapid-public-key', notificationsController.getVapidPublicKey);

router.use(authenticate);

router.get('/', notificationsController.getMyNotifications);
router.delete('/', notificationsController.dismissAllNotifications);
router.patch('/:id/read', notificationsController.markNotificationRead);
router.delete('/:id', notificationsController.dismissNotification);
router.post('/push-subscriptions', notificationsController.registerPushSubscription);
router.post('/', notificationsController.createNotification);

export default router;

