import { Response } from 'express';
import { db } from '../../config/db';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const getUserId = (req: AuthenticatedRequest): string | null => {
  return req.user?.id || req.user?.userId || (req as any).userId || null;
};

// 1. Notification inbox for the signed-in user
export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    });

    return res.json({ success: true, data: notifications, notifications, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 2. Mark a single notification as read
export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({ success: true, data: updated, notification: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 3. Mark every notification of the user as read
export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true, updated: result.count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
