import { Router, Response } from 'express';
import { notificationService, NotificationType, NotificationChannel } from '../services/notification.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * Get notifications for authenticated user
 * GET /api/notifications
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { read, type, limit, offset } = req.query;

    const filters: any = {};

    if (read !== undefined) {
      filters.read = read === 'true';
    }

    if (type) {
      filters.type = type as NotificationType;
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (offset) {
      filters.offset = parseInt(offset as string);
    }

    const notifications = await notificationService.getNotifications(userId, filters);

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve notifications',
      });
    }
  }
});

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve unread count',
    });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
      });
    }
  }
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
    });
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
      });
    }
  }
});

/**
 * Get notification preferences
 * GET /api/notifications/preferences
 */
router.get('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const preferences = await notificationService.getPreferences(userId);

    if (!preferences) {
      // Return default preferences if none exist
      res.json({
        success: true,
        data: {
          userId,
          channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
          types: Object.values(NotificationType),
          quietHoursStart: null,
          quietHoursEnd: null,
        },
      });
    } else {
      res.json({
        success: true,
        data: preferences,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve notification preferences',
    });
  }
});

/**
 * Update notification preferences
 * PUT /api/notifications/preferences
 */
router.put('/preferences', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { channels, types, quietHoursStart, quietHoursEnd } = req.body;

    const preferences = await notificationService.updatePreferences(userId, {
      channels,
      types,
      quietHoursStart,
      quietHoursEnd,
    });

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update notification preferences',
      });
    }
  }
});

/**
 * Send test notification (for testing purposes)
 * POST /api/notifications/test
 */
router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const notification = await notificationService.sendNotification({
      userId,
      type: NotificationType.TOURNAMENT_UPDATE,
      title: 'Test Notification',
      message: 'This is a test notification',
      data: { test: true },
      channels: [NotificationChannel.IN_APP],
    });

    res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification',
    });
  }
});

export default router;
