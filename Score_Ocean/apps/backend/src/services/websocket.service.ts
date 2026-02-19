import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import redisClient from '../db/redis';
import { createClient } from 'redis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connections: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private pubClient: ReturnType<typeof createClient> | null = null;
  private subClient: ReturnType<typeof createClient> | null = null;

  /**
   * Initialize Socket.io server
   * Requirements: 7.4, 19.4
   */
  async initialize(httpServer: HTTPServer): Promise<void> {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Initialize Redis pub/sub clients for multi-server broadcasting
    await this.initializeRedisPubSub();

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.accessSecret) as any;
        socket.userId = decoded.userId;
        socket.userRole = decoded.role;

        next();
      } catch (error) {
        next(new Error('Invalid authentication token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    console.log('✓ WebSocket server initialized');
  }

  /**
   * Initialize Redis pub/sub for multi-server broadcasting
   * Requirements: 7.4
   */
  private async initializeRedisPubSub(): Promise<void> {
    try {
      // Create separate Redis clients for pub/sub
      this.pubClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });

      this.subClient = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
      });

      await this.pubClient.connect();
      await this.subClient.connect();

      // Subscribe to broadcast channels
      await this.subClient.subscribe('score:broadcast', (message) => {
        this.handleScoreBroadcast(message);
      });

      await this.subClient.subscribe('auction:broadcast', (message) => {
        this.handleAuctionBroadcast(message);
      });

      await this.subClient.subscribe('notification:broadcast', (message) => {
        this.handleNotificationBroadcast(message);
      });

      console.log('✓ Redis pub/sub initialized for WebSocket broadcasting');
    } catch (error) {
      console.warn('⚠ Redis pub/sub initialization failed - multi-server broadcasting disabled');
      console.warn('  Single-server broadcasting will still work');
    }
  }

  /**
   * Handle score broadcast from Redis pub/sub
   * Requirements: 7.4
   */
  private handleScoreBroadcast(message: string): void {
    try {
      const data = JSON.parse(message);
      const { matchId, event, payload } = data;

      // Broadcast to all clients in the match room
      this.broadcastToRoom(`match:${matchId}`, event, payload);
    } catch (error) {
      console.error('Error handling score broadcast:', error);
    }
  }

  /**
   * Handle auction broadcast from Redis pub/sub
   */
  private handleAuctionBroadcast(message: string): void {
    try {
      const data = JSON.parse(message);
      const { auctionId, event, payload } = data;

      // Broadcast to all clients in the auction room
      this.broadcastToRoom(`auction:${auctionId}`, event, payload);
    } catch (error) {
      console.error('Error handling auction broadcast:', error);
    }
  }

  /**
   * Handle notification broadcast from Redis pub/sub
   */
  private handleNotificationBroadcast(message: string): void {
    try {
      const data = JSON.parse(message);
      const { userId, event, payload } = data;

      // Send to specific user
      this.sendToUser(userId, event, payload);
    } catch (error) {
      console.error('Error handling notification broadcast:', error);
    }
  }

  /**
   * Handle new socket connection
   * Requirements: 19.4
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const socketId = socket.id;

    console.log(`WebSocket connected: userId=${userId}, socketId=${socketId}`);

    // Track connection
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(socketId);

    // Store connection in Redis for multi-server support
    this.storeConnection(userId, socketId);

    // Handle room subscriptions
    socket.on('subscribe:match', (matchId: string) => {
      this.subscribeToMatch(socket, matchId);
    });

    socket.on('unsubscribe:match', (matchId: string) => {
      this.unsubscribeFromMatch(socket, matchId);
    });

    socket.on('subscribe:auction', (auctionId: string) => {
      this.subscribeToAuction(socket, auctionId);
    });

    socket.on('unsubscribe:auction', (auctionId: string) => {
      this.unsubscribeFromAuction(socket, auctionId);
    });

    socket.on('subscribe:tournament', (tournamentId: string) => {
      this.subscribeToTournament(socket, tournamentId);
    });

    socket.on('unsubscribe:tournament', (tournamentId: string) => {
      this.unsubscribeFromTournament(socket, tournamentId);
    });

    // Handle reconnection - deliver missed updates
    socket.on('reconnect:sync', async (data: { lastSyncTime: string }) => {
      await this.handleReconnectionSync(socket, data.lastSyncTime);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Subscribe socket to match room
   * Requirements: 7.4, 19.4
   */
  private subscribeToMatch(socket: AuthenticatedSocket, matchId: string): void {
    const roomName = `match:${matchId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} subscribed to ${roomName}`);

    // Send current match state
    socket.emit('match:subscribed', { matchId, room: roomName });
  }

  /**
   * Unsubscribe socket from match room
   */
  private unsubscribeFromMatch(socket: AuthenticatedSocket, matchId: string): void {
    const roomName = `match:${matchId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} unsubscribed from ${roomName}`);
  }

  /**
   * Subscribe socket to auction room
   * Requirements: 21.5, 19.4
   */
  private subscribeToAuction(socket: AuthenticatedSocket, auctionId: string): void {
    const roomName = `auction:${auctionId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} subscribed to ${roomName}`);

    socket.emit('auction:subscribed', { auctionId, room: roomName });
  }

  /**
   * Unsubscribe socket from auction room
   */
  private unsubscribeFromAuction(socket: AuthenticatedSocket, auctionId: string): void {
    const roomName = `auction:${auctionId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} unsubscribed from ${roomName}`);
  }

  /**
   * Subscribe socket to tournament room
   */
  private subscribeToTournament(socket: AuthenticatedSocket, tournamentId: string): void {
    const roomName = `tournament:${tournamentId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} subscribed to ${roomName}`);

    socket.emit('tournament:subscribed', { tournamentId, room: roomName });
  }

  /**
   * Unsubscribe socket from tournament room
   */
  private unsubscribeFromTournament(socket: AuthenticatedSocket, tournamentId: string): void {
    const roomName = `tournament:${tournamentId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} unsubscribed from ${roomName}`);
  }

  /**
   * Handle reconnection and sync missed updates
   * Requirements: 19.5, 19.6
   */
  private async handleReconnectionSync(socket: AuthenticatedSocket, lastSyncTime: string): Promise<void> {
    const userId = socket.userId!;
    const lastSync = new Date(lastSyncTime);

    try {
      // Get missed updates from Redis
      const missedUpdates = await this.getMissedUpdates(userId, lastSync);

      if (missedUpdates.length > 0) {
        // Sort updates by timestamp to ensure correct order
        missedUpdates.sort((a, b) => a.timestamp - b.timestamp);

        socket.emit('sync:updates', {
          updates: missedUpdates,
          syncTime: new Date().toISOString(),
          count: missedUpdates.length,
        });

        console.log(`Delivered ${missedUpdates.length} missed updates to user ${userId}`);

        // Clean up delivered updates
        await this.cleanupDeliveredUpdates(userId, lastSync);
      } else {
        socket.emit('sync:complete', {
          message: 'No missed updates',
          syncTime: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error syncing missed updates:', error);
      socket.emit('sync:error', { message: 'Failed to sync missed updates' });
    }
  }

  /**
   * Get missed updates for a user since last sync
   * Requirements: 19.5
   */
  private async getMissedUpdates(userId: string, since: Date): Promise<any[]> {
    try {
      // Get missed updates from Redis sorted set
      const key = `missed_updates:${userId}`;
      const sinceTimestamp = since.getTime();
      const now = Date.now();

      const updates = await redisClient.zRangeByScore(key, sinceTimestamp, now);

      // Parse and return updates
      return updates.map((update) => JSON.parse(update));
    } catch (error) {
      console.error('Error fetching missed updates:', error);
      return [];
    }
  }

  /**
   * Clean up delivered updates from Redis
   * Requirements: 19.5
   */
  private async cleanupDeliveredUpdates(userId: string, before: Date): Promise<void> {
    try {
      const key = `missed_updates:${userId}`;
      const beforeTimestamp = before.getTime();

      // Remove updates older than the sync time
      await redisClient.zRemRangeByScore(key, 0, beforeTimestamp);
    } catch (error) {
      console.error('Error cleaning up delivered updates:', error);
    }
  }

  /**
   * Store missed update for offline users
   * Requirements: 19.5, 19.6
   */
  private async storeMissedUpdate(userId: string, update: any): Promise<void> {
    try {
      const key = `missed_updates:${userId}`;
      const timestamp = Date.now();
      const updateData = JSON.stringify({ ...update, timestamp });

      // Store in Redis sorted set with timestamp as score
      // This ensures concurrent updates are preserved in order
      await redisClient.zAdd(key, { score: timestamp, value: updateData });

      // Set expiry to 7 days
      await redisClient.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      console.error('Error storing missed update:', error);
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket): void {
    const userId = socket.userId!;
    const socketId = socket.id;

    console.log(`WebSocket disconnected: userId=${userId}, socketId=${socketId}`);

    // Remove from connections map
    const userSockets = this.connections.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.connections.delete(userId);
      }
    }

    // Remove from Redis
    this.removeConnection(userId, socketId);
  }

  /**
   * Store connection in Redis
   */
  private async storeConnection(userId: string, socketId: string): Promise<void> {
    try {
      const key = `connections:${userId}`;
      await redisClient.sAdd(key, socketId);
      await redisClient.expire(key, 24 * 60 * 60); // 24 hours
    } catch (error) {
      console.error('Error storing connection:', error);
    }
  }

  /**
   * Remove connection from Redis
   */
  private async removeConnection(userId: string, socketId: string): Promise<void> {
    try {
      const key = `connections:${userId}`;
      await redisClient.sRem(key, socketId);
    } catch (error) {
      console.error('Error removing connection:', error);
    }
  }

  /**
   * Broadcast event to a room
   * Requirements: 7.4, 21.5
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocket server not initialized');
      return;
    }

    this.io.to(room).emit(event, data);
  }

  /**
   * Publish score update via Redis pub/sub for multi-server broadcasting
   * Requirements: 7.4, 19.6
   */
  async publishScoreUpdate(matchId: string, event: string, payload: any): Promise<void> {
    try {
      const timestamp = Date.now();
      const updateWithTimestamp = { ...payload, timestamp };

      // Broadcast locally
      this.broadcastToRoom(`match:${matchId}`, event, updateWithTimestamp);

      // Publish to Redis for other servers
      if (this.pubClient && this.pubClient.isOpen) {
        const message = JSON.stringify({ matchId, event, payload: updateWithTimestamp });
        await this.pubClient.publish('score:broadcast', message);
      }

      // Cache the score update in Redis
      await this.cacheScoreUpdate(matchId, updateWithTimestamp);

      // Store in score update history for concurrent update tracking
      await this.storeScoreUpdateHistory(matchId, updateWithTimestamp);
    } catch (error) {
      console.error('Error publishing score update:', error);
    }
  }

  /**
   * Store score update in history for concurrent update tracking
   * Requirements: 19.6
   */
  private async storeScoreUpdateHistory(matchId: string, updateData: any): Promise<void> {
    try {
      const key = `match:${matchId}:history`;
      const timestamp = updateData.timestamp || Date.now();
      const data = JSON.stringify(updateData);

      // Store in sorted set with timestamp as score
      await redisClient.zAdd(key, { score: timestamp, value: data });

      // Keep only last 100 updates
      await redisClient.zRemRangeByRank(key, 0, -101);

      // Set expiry to 7 days
      await redisClient.expire(key, 7 * 24 * 60 * 60);
    } catch (error) {
      console.error('Error storing score update history:', error);
    }
  }

  /**
   * Get score update history for a match
   * Requirements: 19.6
   */
  async getScoreUpdateHistory(matchId: string, since?: number): Promise<any[]> {
    try {
      const key = `match:${matchId}:history`;
      const minScore = since || 0;
      const maxScore = Date.now();

      const updates = await redisClient.zRangeByScore(key, minScore, maxScore);

      return updates.map((update) => JSON.parse(update));
    } catch (error) {
      console.error('Error getting score update history:', error);
      return [];
    }
  }

  /**
   * Cache score update in Redis
   * Requirements: 7.4
   */
  private async cacheScoreUpdate(matchId: string, scoreData: any): Promise<void> {
    try {
      const key = `match:${matchId}:score`;
      const data = {
        ...scoreData,
        lastUpdate: new Date().toISOString(),
      };

      await redisClient.hSet(key, data);
      await redisClient.expire(key, 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      console.error('Error caching score update:', error);
    }
  }

  /**
   * Get cached score from Redis
   * Requirements: 7.4
   */
  async getCachedScore(matchId: string): Promise<any | null> {
    try {
      const key = `match:${matchId}:score`;
      const data = await redisClient.hGetAll(key);

      if (Object.keys(data).length === 0) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached score:', error);
      return null;
    }
  }

  /**
   * Publish auction update via Redis pub/sub
   * Requirements: 21.5
   */
  async publishAuctionUpdate(auctionId: string, event: string, payload: any): Promise<void> {
    try {
      // Broadcast locally
      this.broadcastToRoom(`auction:${auctionId}`, event, payload);

      // Publish to Redis for other servers
      if (this.pubClient && this.pubClient.isOpen) {
        const message = JSON.stringify({ auctionId, event, payload });
        await this.pubClient.publish('auction:broadcast', message);
      }
    } catch (error) {
      console.error('Error publishing auction update:', error);
    }
  }

  /**
   * Publish notification via Redis pub/sub
   * Requirements: 10.5
   */
  async publishNotification(userId: string, event: string, payload: any): Promise<void> {
    try {
      // Send locally
      await this.sendToUser(userId, event, payload);

      // Publish to Redis for other servers
      if (this.pubClient && this.pubClient.isOpen) {
        const message = JSON.stringify({ userId, event, payload });
        await this.pubClient.publish('notification:broadcast', message);
      }
    } catch (error) {
      console.error('Error publishing notification:', error);
    }
  }

  /**
   * Send event to specific user (all their connections)
   * Requirements: 10.5
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    if (!this.io) {
      console.warn('WebSocket server not initialized');
      return;
    }

    // Get user's socket connections
    const userSockets = this.connections.get(userId);

    if (userSockets && userSockets.size > 0) {
      // User is online - send to all their sockets
      userSockets.forEach((socketId) => {
        this.io!.to(socketId).emit(event, data);
      });
    } else {
      // User is offline - store as missed update
      await this.storeMissedUpdate(userId, { event, data });
    }
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const userSockets = this.connections.get(userId);
    return userSockets !== undefined && userSockets.size > 0;
  }

  /**
   * Get number of connections for a user
   */
  getUserConnectionCount(userId: string): number {
    const userSockets = this.connections.get(userId);
    return userSockets ? userSockets.size : 0;
  }

  /**
   * Get total number of connected users
   */
  getConnectedUsersCount(): number {
    return this.connections.size;
  }

  /**
   * Get total number of socket connections
   */
  getTotalConnectionsCount(): number {
    let total = 0;
    this.connections.forEach((sockets) => {
      total += sockets.size;
    });
    return total;
  }
}

export const websocketService = new WebSocketService();
