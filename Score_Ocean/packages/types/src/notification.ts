import { TimeRange } from './common';

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

export interface NotificationCreate {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  channels?: NotificationChannel[];
}

export interface NotificationPreferences {
  channels: NotificationChannel[];
  types: NotificationType[];
  quietHours?: TimeRange;
}

export interface NotificationFilter {
  read?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}
