import { Response } from 'express';
import { dbService } from '../services/dbService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const notifications = await dbService.getNotificationsForUser(req.user.id);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications' });
  }
};

export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const success = await dbService.markNotificationAsRead(id, req.user.id);

    res.json({
      success,
      message: success ? 'Notification marked as read' : 'Notification not found'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
};

export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await dbService.markAllNotificationsAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
};
