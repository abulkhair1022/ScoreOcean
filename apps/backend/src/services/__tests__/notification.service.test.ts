import { notificationService, NotificationType, NotificationChannel } from '../notification.service';
import { query } from '../../db/postgres';
import redisClient from '../../db/redis';
import { websocketService } from '../websocket.service';

jest.mock('../../db/postgres');
jest.mock('../../db/redis');
jest.mock('../websocket.service');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
const mockWebsocketService = websocketService as jest.Mocked<typeof websocketService>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock WebSocket service for all tests
    mockWebsocketService.publishNotification = jest.fn().mockResolvedValue(undefined);
  });

  describe('sendNotification', () => {
    it('should create and store a notification', async () => {
      const userId = 'user-123';
      const notification = {
        userId,
        type: NotificationType.TEAM_INVITATION,
        title: 'Team Invitation',
        message: 'You have been invited to join a team',
        data: { teamId: 'team-123' },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      };

      // Mock getPreferences to return null (no preferences set)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock notification insert
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-123',
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            channels: notification.channels,
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      // Mock Redis queue
      mockRedisClient.rPush = jest.fn().mockResolvedValue(1);

      // Mock WebSocket broadcast
      mockWebsocketService.publishNotification = jest.fn().mockResolvedValue(undefined);

      const result = await notificationService.sendNotification(notification);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.type).toBe(NotificationType.TEAM_INVITATION);
      expect(result.title).toBe('Team Invitation');
      expect(mockQuery).toHaveBeenCalledTimes(2); // getPreferences + insert
      expect(mockRedisClient.rPush).toHaveBeenCalled();
      expect(mockWebsocketService.publishNotification).toHaveBeenCalledWith(
        userId,
        'notification:new',
        expect.objectContaining({
          id: 'notif-123',
          type: NotificationType.TEAM_INVITATION,
          title: 'Team Invitation',
        })
      );
    });

    it('should apply user preferences to notification channels', async () => {
      const userId = 'user-123';
      const notification = {
        userId,
        type: NotificationType.TEAM_INVITATION,
        title: 'Team Invitation',
        message: 'You have been invited to join a team',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      };

      // Mock getPreferences to return preferences with only IN_APP and EMAIL
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            types: Object.values(NotificationType),
            quiet_hours_start: null,
            quiet_hours_end: null,
          },
        ],
        rowCount: 1,
      } as any);

      // Mock notification insert
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-123',
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: {},
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL], // SMS filtered out
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockRedisClient.rPush = jest.fn().mockResolvedValue(1);

      const result = await notificationService.sendNotification(notification);

      expect(result.channels).toEqual([NotificationChannel.IN_APP, NotificationChannel.EMAIL]);
      expect(result.channels).not.toContain(NotificationChannel.SMS);
    });

    it('should filter out disabled notification types', async () => {
      const userId = 'user-123';
      const notification = {
        userId,
        type: NotificationType.SCORE_UPDATE,
        title: 'Score Update',
        message: 'Match score updated',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      };

      // Mock getPreferences with SCORE_UPDATE disabled
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            types: [NotificationType.TEAM_INVITATION, NotificationType.MATCH_REMINDER], // SCORE_UPDATE not included
            quiet_hours_start: null,
            quiet_hours_end: null,
          },
        ],
        rowCount: 1,
      } as any);

      // Mock notification insert - should only have IN_APP channel
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-123',
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: {},
            channels: [NotificationChannel.IN_APP], // Only IN_APP when type is disabled
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockRedisClient.rPush = jest.fn().mockResolvedValue(1);

      const result = await notificationService.sendNotification(notification);

      expect(result.channels).toEqual([NotificationChannel.IN_APP]);
    });

    it('should respect quiet hours', async () => {
      const userId = 'user-123';
      const notification = {
        userId,
        type: NotificationType.TEAM_INVITATION,
        title: 'Team Invitation',
        message: 'You have been invited to join a team',
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      };

      // Mock current time to be in quiet hours (e.g., 23:00)
      const now = new Date();
      now.setHours(23, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      // Mock getPreferences with quiet hours 22:00 to 08:00
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
            types: Object.values(NotificationType),
            quiet_hours_start: '22:00',
            quiet_hours_end: '08:00',
          },
        ],
        rowCount: 1,
      } as any);

      // Mock notification insert - should only have IN_APP during quiet hours
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-123',
            user_id: userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: {},
            channels: [NotificationChannel.IN_APP],
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      mockRedisClient.rPush = jest.fn().mockResolvedValue(1);

      const result = await notificationService.sendNotification(notification);

      expect(result.channels).toEqual([NotificationChannel.IN_APP]);

      jest.restoreAllMocks();
    });

    it('should throw error for missing required fields', async () => {
      const invalidNotification = {
        userId: 'user-123',
        type: NotificationType.TEAM_INVITATION,
        title: '',
        message: '',
      };

      await expect(notificationService.sendNotification(invalidNotification as any)).rejects.toThrow(
        'Missing required notification fields'
      );
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for a user', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            user_id: userId,
            type: NotificationType.TEAM_INVITATION,
            title: 'Team Invitation',
            message: 'You have been invited',
            data: {},
            channels: [NotificationChannel.IN_APP],
            read: false,
            created_at: new Date(),
          },
          {
            id: 'notif-2',
            user_id: userId,
            type: NotificationType.MATCH_REMINDER,
            title: 'Match Reminder',
            message: 'Match starts in 1 hour',
            data: {},
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            read: true,
            created_at: new Date(),
          },
        ],
        rowCount: 2,
      } as any);

      const result = await notificationService.getNotifications(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('notif-1');
      expect(result[1].id).toBe('notif-2');
    });

    it('should filter notifications by read status', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            user_id: userId,
            type: NotificationType.TEAM_INVITATION,
            title: 'Team Invitation',
            message: 'You have been invited',
            data: {},
            channels: [NotificationChannel.IN_APP],
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await notificationService.getNotifications(userId, { read: false });

      expect(result).toHaveLength(1);
      expect(result[0].read).toBe(false);
    });

    it('should filter notifications by type', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            user_id: userId,
            type: NotificationType.TEAM_INVITATION,
            title: 'Team Invitation',
            message: 'You have been invited',
            data: {},
            channels: [NotificationChannel.IN_APP],
            read: false,
            created_at: new Date(),
          },
        ],
        rowCount: 1,
      } as any);

      const result = await notificationService.getNotifications(userId, {
        type: NotificationType.TEAM_INVITATION,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(NotificationType.TEAM_INVITATION);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);

      await notificationService.markAsRead(notificationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
    });

    it('should throw error if notification not found', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any);

      await expect(notificationService.markAsRead(notificationId, userId)).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 5 } as any);

      await notificationService.markAllAsRead(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
        [userId]
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
      } as any);

      const count = await notificationService.getUnreadCount(userId);

      expect(count).toBe(3);
    });
  });

  describe('updatePreferences', () => {
    it('should create new preferences if none exist', async () => {
      const userId = 'user-123';
      const preferences = {
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        types: [NotificationType.TEAM_INVITATION, NotificationType.MATCH_REMINDER],
      };

      // Mock getPreferences to return null
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock insert
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);

      // Mock getPreferences again to return created preferences
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: preferences.channels,
            types: preferences.types,
            quiet_hours_start: null,
            quiet_hours_end: null,
          },
        ],
        rowCount: 1,
      } as any);

      const result = await notificationService.updatePreferences(userId, preferences);

      expect(result.channels).toEqual(preferences.channels);
      expect(result.types).toEqual(preferences.types);
    });

    it('should update existing preferences', async () => {
      const userId = 'user-123';
      const preferences = {
        channels: [NotificationChannel.IN_APP],
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
      };

      // Mock getPreferences to return existing preferences
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            types: Object.values(NotificationType),
            quiet_hours_start: null,
            quiet_hours_end: null,
          },
        ],
        rowCount: 1,
      } as any);

      // Mock update
      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);

      // Mock getPreferences again to return updated preferences
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: userId,
            channels: preferences.channels,
            types: Object.values(NotificationType),
            quiet_hours_start: preferences.quietHoursStart,
            quiet_hours_end: preferences.quietHoursEnd,
          },
        ],
        rowCount: 1,
      } as any);

      const result = await notificationService.updatePreferences(userId, preferences);

      expect(result.channels).toEqual(preferences.channels);
      expect(result.quietHoursStart).toBe(preferences.quietHoursStart);
      expect(result.quietHoursEnd).toBe(preferences.quietHoursEnd);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 1 } as any);

      await notificationService.deleteNotification(notificationId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
    });

    it('should throw error if notification not found', async () => {
      const notificationId = 'notif-123';
      const userId = 'user-123';

      mockQuery.mockResolvedValueOnce({ rowCount: 0 } as any);

      await expect(
        notificationService.deleteNotification(notificationId, userId)
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send multiple notifications', async () => {
      const notifications = [
        {
          userId: 'user-1',
          type: NotificationType.TEAM_INVITATION,
          title: 'Invitation 1',
          message: 'Message 1',
        },
        {
          userId: 'user-2',
          type: NotificationType.TEAM_INVITATION,
          title: 'Invitation 2',
          message: 'Message 2',
        },
      ];

      // Mock for each notification: getPreferences + insert
      for (let i = 0; i < notifications.length; i++) {
        // getPreferences
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
        // insert
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              id: `notif-${i}`,
              user_id: notifications[i].userId,
              type: notifications[i].type,
              title: notifications[i].title,
              message: notifications[i].message,
              data: {},
              channels: [NotificationChannel.IN_APP],
              read: false,
              created_at: new Date(),
            },
          ],
          rowCount: 1,
        } as any);
      }

      mockRedisClient.rPush = jest.fn().mockResolvedValue(1);

      const results = await notificationService.sendBulkNotifications(notifications);

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe('user-1');
      expect(results[1].userId).toBe('user-2');
    });
  });
});
