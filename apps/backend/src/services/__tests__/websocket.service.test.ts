import { websocketService } from '../websocket.service';

describe('WebSocketService', () => {
  describe('Connection Management', () => {
    it('should initialize with no connections', () => {
      expect(websocketService.getConnectedUsersCount()).toBe(0);
      expect(websocketService.getTotalConnectionsCount()).toBe(0);
    });

    it('should check if user is connected', () => {
      const userId = 'test-user-id';
      expect(websocketService.isUserConnected(userId)).toBe(false);
    });

    it('should get user connection count', () => {
      const userId = 'test-user-id';
      expect(websocketService.getUserConnectionCount(userId)).toBe(0);
    });
  });

  describe('Score Broadcasting', () => {
    it('should handle broadcast when WebSocket not initialized', () => {
      // Should not throw error
      expect(() => {
        websocketService.broadcastToRoom('match:123', 'score:update', { score: 10 });
      }).not.toThrow();
    });

    it('should handle publishScoreUpdate gracefully', async () => {
      // Should not throw error even when Redis is not connected
      await expect(
        websocketService.publishScoreUpdate('match-123', 'score:update', {
          matchId: 'match-123',
          score: { homeScore: 1, awayScore: 0 },
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Cached Score', () => {
    it('should return null when score not cached', async () => {
      const score = await websocketService.getCachedScore('non-existent-match');
      expect(score).toBeNull();
    });
  });

  describe('Score Update History', () => {
    it('should return empty array when no history exists', async () => {
      const history = await websocketService.getScoreUpdateHistory('non-existent-match');
      expect(history).toEqual([]);
    });

    it('should handle history with since parameter', async () => {
      const history = await websocketService.getScoreUpdateHistory('match-123', Date.now() - 1000);
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('User Notifications', () => {
    it('should handle sendToUser when user is offline', async () => {
      // Should not throw error
      await expect(
        websocketService.sendToUser('offline-user', 'notification', { message: 'test' })
      ).resolves.not.toThrow();
    });
  });

  describe('Auction Broadcasting', () => {
    it('should handle publishAuctionUpdate gracefully', async () => {
      await expect(
        websocketService.publishAuctionUpdate('auction-123', 'bid:placed', {
          auctionId: 'auction-123',
          bid: 1000,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Notification Broadcasting', () => {
    it('should handle publishNotification gracefully', async () => {
      await expect(
        websocketService.publishNotification('user-123', 'notification:new', {
          message: 'Test notification',
        })
      ).resolves.not.toThrow();
    });
  });
});
