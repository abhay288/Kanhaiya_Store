import { Request, Response, NextFunction } from 'express';
import { Notification } from '../../models/notification.model';
import { sendSuccess } from '../../utils/apiResponse';
import mongoose from 'mongoose';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
      const phone = req.query.phone as string;

      const query: any = {};
      if (userId) {
        query.userId = userId;
      } else if (phone) {
        query.customerPhone = phone.trim();
      } else {
        return sendSuccess(res, [], 'No notifications for unauthenticated request without phone');
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return sendSuccess(res, notifications, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await Notification.findByIdAndUpdate(id, { isRead: true });
      return sendSuccess(res, { success: true }, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
      if (userId) {
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
      }
      return sendSuccess(res, { success: true }, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
