import { query } from '../db/postgres';
import redisClient from '../db/redis';
import { AppError } from '../middleware/errorHandler';
import { websocketService } from './websocket.service';

export enum NotificationType {
  TEAM_INVITATION = 'TEAM_INVITATION',
  REGISTRATION_CONFIRMED = 'REGISTRATION_CONFIRMED',
  FIXTURES_PUBLISHED = 'FIXTURES_PUBLISHED',
  MATCH_REMINDER = 'MATCH_REMINDER',
  SCORE_UPDATE = 'SCORE_UPDATE',
  AUCTION_BID = 'AUCTION_BID',
  AUCTION_WON = 'AUCTION_WON',
  TOURNAMENT_UPDATE = 'TOURNAMENT_UPDATE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export interface NotificationCreate {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel[];
  types: NotificationType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface NotificationFilter {
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

// Redis queue key for notifications
const NOTIFICATION_QUEUE_KEY = 'notification:queue';

export class NotificationService {
  /**
   * Send a notification to a user
   */
  async sendNotification(notification: NotificationCreate): Promise<Notification> {
    const { userId, type, title, message, data, channels } = notification;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      throw new AppError('Missing required notification fields', 400);
    }

    // Get user preferences
    const preferences = await this.getPreferences(userId);

    // Determine which channels to use
    let effectiveChannels = channels || [NotificationChannel.IN_APP];

    // Apply user preferences if they exist
    if (preferences) {
      // Filter out channels not enabled by user
      effectiveChannels = effectiveChannels.filter((channel) =>
        preferences.channels.includes(channel)
      );

      // Check if notification type is enabled
      if (!preferences.types.includes(type)) {
        // User has disabled this notification type, only send IN_APP
        effectiveChannels = effectiveChannels.filter(
          (channel) => channel === NotificationChannel.IN_APP
        );
      }

      // Check quiet hours
      if (preferences.quietHoursStart && preferences.quietHoursEnd) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;

        if (this.isInQuietHours(currentTime, preferences.quietHoursStart, preferences.quietHoursEnd)) {
          // During quiet hours, only send IN_APP notifications
          effectiveChannels = effectiveChannels.filter(
            (channel) => channel === NotificationChannel.IN_APP
          );
        }
      }
    }

    // Ensure at least IN_APP channel is used
    if (effectiveChannels.length === 0) {
      effectiveChannels = [NotificationChannel.IN_APP];
    }

    // Store notification in database
    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, data, channels, read)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, type, title, message, JSON.stringify(data || {}), effectiveChannels, false]
    );

    const savedNotification = this.mapRowToNotification(result.rows[0]);

    // Queue notification for delivery via external channels
    await this.queueNotification(savedNotification);

    // Broadcast notification via WebSocket for real-time delivery
    await this.broadcastNotification(savedNotification);

    return savedNotification;
  }

  /**
   * Queue notification for async delivery
   */
  private async queueNotification(notification: Notification): Promise<void> {
    try {
      // Add to Redis queue for processing by background workers
      await redisClient.rPush(
        NOTIFICATION_QUEUE_KEY,
        JSON.stringify({
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          channels: notification.channels,
          createdAt: notification.createdAt,
        })
      );
    } catch (error) {
      console.error('Failed to queue notification:', error);
      // Don't throw error - notification is already saved in DB
    }
  }

  /**
   * Broadcast notification via WebSocket for real-time delivery
   * Requirements: 10.5
   */
  private async broadcastNotification(notification: Notification): Promise<void> {
    try {
      // Send notification to user via WebSocket
      await websocketService.publishNotification(
        notification.userId,
        'notification:new',
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          channels: notification.channels,
          read: notification.read,
          createdAt: notification.createdAt,
        }
      );
    } catch (error) {
      console.error('Failed to broadcast notification via WebSocket:', error);
      // Don't throw error - notification is already saved in DB and queued
    }
  }

  /**
   * Process notification queue (called by background worker)
   */
  async processNotificationQueue(): Promise<void> {
    try {
      // Get notification from queue
      const item = await redisClient.lPop(NOTIFICATION_QUEUE_KEY);

      if (!item) {
        return;
      }

      const notification = JSON.parse(item);

      // Send via each channel
      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case NotificationChannel.EMAIL:
              await this.sendEmail(notification);
              break;
            case NotificationChannel.SMS:
              await this.sendSMS(notification);
              break;
            case NotificationChannel.PUSH:
              // Push notifications would be handled here
              break;
            case NotificationChannel.IN_APP:
              // IN_APP is already handled by database storage
              break;
          }
        } catch (error) {
          console.error(`Failed to send notification via ${channel}:`, error);
          // Continue with other channels even if one fails
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: any): Promise<void> {
    // Get user email
    const userResult = await query('SELECT email FROM users WHERE id = $1', [notification.userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userEmail = userResult.rows[0].email;

    // Email service integration would go here
    // For now, just log (will be implemented with actual email service)
    console.log(`[EMAIL] To: ${userEmail}, Subject: ${notification.title}, Body: ${notification.message}`);

    // TODO: Integrate with SendGrid or AWS SES
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(config.email.apiKey);
    // await sgMail.send({
    //   to: userEmail,
    //   from: config.email.from,
    //   subject: notification.title,
    //   text: notification.message,
    //   html: `<p>${notification.message}</p>`,
    // });
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: any): Promise<void> {
    // Get user phone
    const userResult = await query(
      'SELECT phone FROM user_profiles WHERE user_id = $1',
      [notification.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].phone) {
      console.log('User has no phone number, skipping SMS');
      return;
    }

    const userPhone = userResult.rows[0].phone;

    // SMS service integration would go here
    // For now, just log (will be implemented with actual SMS service)
    console.log(`[SMS] To: ${userPhone}, Message: ${notification.message}`);

    // TODO: Integrate with Twilio
    // Example with Twilio:
    // const twilio = require('twilio');
    // const client = twilio(config.sms.accountSid, config.sms.authToken);
    // await client.messages.create({
    //   body: notification.message,
    //   from: config.sms.from,
    //   to: userPhone,
    // });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, filters: NotificationFilter = {}): Promise<Notification[]> {
    const { read, type, limit = 50, offset = 0 } = filters;

    let queryText = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (read !== undefined) {
      queryText += ` AND read = $${paramIndex}`;
      params.push(read);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    return result.rows.map(this.mapRowToNotification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Notification not found', 404);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [
      userId,
    ]);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get user notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const result = await query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      channels: row.channels,
      types: row.types,
      quietHoursStart: row.quiet_hours_start,
      quietHoursEnd: row.quiet_hours_end,
    };
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const { channels, types, quietHoursStart, quietHoursEnd } = preferences;

    // Check if preferences exist
    const existing = await this.getPreferences(userId);

    if (existing) {
      // Update existing preferences
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (channels !== undefined) {
        fields.push(`channels = $${paramIndex++}`);
        values.push(channels);
      }

      if (types !== undefined) {
        fields.push(`types = $${paramIndex++}`);
        values.push(types);
      }

      if (quietHoursStart !== undefined) {
        fields.push(`quiet_hours_start = $${paramIndex++}`);
        values.push(quietHoursStart);
      }

      if (quietHoursEnd !== undefined) {
        fields.push(`quiet_hours_end = $${paramIndex++}`);
        values.push(quietHoursEnd);
      }

      if (fields.length === 0) {
        throw new AppError('No fields to update', 400);
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(userId);

      await query(
        `UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id = $${paramIndex}`,
        values
      );
    } else {
      // Create new preferences
      const defaultChannels = channels || [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
      const defaultTypes = types || Object.values(NotificationType);

      await query(
        `INSERT INTO notification_preferences (user_id, channels, types, quiet_hours_start, quiet_hours_end)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, defaultChannels, defaultTypes, quietHoursStart || null, quietHoursEnd || null]
      );
    }

    const updated = await this.getPreferences(userId);
    if (!updated) {
      throw new AppError('Failed to retrieve updated preferences', 500);
    }

    return updated;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Notification not found', 404);
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
    if (startTime < endTime) {
      // Normal case: e.g., 22:00 to 08:00 next day
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Crosses midnight: e.g., 22:00 to 08:00
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      data: row.data || {},
      channels: row.channels,
      read: row.read,
      createdAt: row.created_at,
    };
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(notifications: NotificationCreate[]): Promise<Notification[]> {
    const results: Notification[] = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push(result);
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Continue with other notifications
      }
    }

    return results;
  }
}

export const notificationService = new NotificationService();
