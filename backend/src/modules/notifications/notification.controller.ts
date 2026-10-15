import { Request, Response, NextFunction } from 'express';
import { Notification } from '../../models/notification.model';
import { sendSuccess } from '../../utils/apiResponse';
import mongoose from 'mongoose';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id ? new mongoose.Types.ObjectId(req.user.id) : null;
      const isAdmin = (req.user as any)?.role === 'ADMIN' || (req.user as any)?.email === 'kanhaiyaastore@gmail.com' || req.query.admin === 'true';
      const phone = req.query.phone as string;

      const query: any = {};
      if (isAdmin) {
        query.$or = [
          { isAdmin: true },
          { type: 'ADMIN_ALERT' },
          { appName: 'Store Admin Alert' },
          ...(userId ? [{ userId }] : []),
        ];
      } else if (userId) {
        query.$or = [
          { userId, isAdmin: { $ne: true } },
          { customerPhone: phone ? phone.trim() : undefined, isAdmin: { $ne: true } },
          { userId: null, customerPhone: '', isAdmin: { $ne: true } },
          { type: 'STORE_ANNOUNCEMENT' }
        ].filter(Boolean);
      } else if (phone) {
        query.$or = [
          { customerPhone: phone.trim(), isAdmin: { $ne: true } },
          { userId: null, customerPhone: '', isAdmin: { $ne: true } },
          { type: 'STORE_ANNOUNCEMENT' }
        ];
      } else {
        query.$or = [
          { userId: null, customerPhone: '', isAdmin: { $ne: true } },
          { type: 'STORE_ANNOUNCEMENT' }
        ];
      }

      let notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      return sendSuccess(res, notifications || [], 'Notifications retrieved');
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
      const phone = (req.body?.phone || req.query.phone) as string;
      const ids = req.body?.ids as string[];

      if (userId) {
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
      } else if (phone) {
        await Notification.updateMany({ customerPhone: phone.trim(), isRead: false }, { isRead: true });
      } else if (ids && Array.isArray(ids) && ids.length > 0) {
        await Notification.updateMany({ _id: { $in: ids } }, { isRead: true });
      } else {
        await Notification.updateMany({ isRead: false }, { isRead: true });
      }
      return sendSuccess(res, { success: true }, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
