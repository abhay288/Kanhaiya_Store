import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { optionalAuthenticate } from '../../middleware/authenticate';

const router = Router();

router.get('/', optionalAuthenticate, NotificationController.getNotifications as any);
router.patch('/:id/read', optionalAuthenticate, NotificationController.markAsRead as any);
router.patch('/read-all', optionalAuthenticate, NotificationController.markAllAsRead as any);

export const notificationRouter = router;
