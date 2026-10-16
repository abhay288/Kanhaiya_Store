import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate, optionalAuthenticate } from '../../middleware/authenticate';
import { requireAdmin } from '../../middleware/admin.middleware';

const router = Router();

router.get('/', optionalAuthenticate, NotificationController.getNotifications as any);
router.patch('/:id/read', optionalAuthenticate, NotificationController.markAsRead as any);
router.patch('/read-all', optionalAuthenticate, NotificationController.markAllAsRead as any);
router.delete('/:id', optionalAuthenticate, NotificationController.deleteNotification as any);
router.delete('/', optionalAuthenticate, NotificationController.clearAllNotifications as any);
router.post('/clear-all', optionalAuthenticate, NotificationController.clearAllNotifications as any);
router.post('/broadcast', authenticate, requireAdmin, NotificationController.broadcastNotification as any);

export const notificationRouter = router;
