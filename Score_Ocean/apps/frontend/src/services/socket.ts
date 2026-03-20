import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    const token = localStorage.getItem('accessToken');

    // If already connected with a valid token, reuse
    if (this.socket?.connected) {
      return this.socket;
    }

    // If socket exists but disconnected (e.g. token expired), destroy and recreate
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    // In dev, route through Vite proxy (/socket.io is proxied to :3000 with ws:true).
    // In prod, use VITE_API_URL base or same origin.
    const socketUrl = import.meta.env.PROD
      ? import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin
      : window.location.origin;

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],  // polling first, then upgrade to WS
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Match-related events
  subscribeToMatch(matchId: string, callback: (data: any) => void): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('subscribe:match', { matchId });
    this.socket?.on(`match:${matchId}:update`, callback);
  }

  unsubscribeFromMatch(matchId: string): void {
    this.socket?.emit('unsubscribe:match', { matchId });
    this.socket?.off(`match:${matchId}:update`);
  }

  // Auction-related events
  subscribeToAuction(auctionId: string, callback: (data: any) => void): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('subscribe:auction', { auctionId });
    this.socket?.on(`auction:${auctionId}:update`, callback);
  }

  unsubscribeFromAuction(auctionId: string): void {
    this.socket?.emit('unsubscribe:auction', { auctionId });
    this.socket?.off(`auction:${auctionId}:update`);
  }

  // Notification-related events
  subscribeToNotifications(userId: string, callback: (data: any) => void): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('subscribe:notifications', { userId });
    this.socket?.on(`notification:${userId}`, callback);
  }

  unsubscribeFromNotifications(userId: string): void {
    this.socket?.emit('unsubscribe:notifications', { userId });
    this.socket?.off(`notification:${userId}`);
  }
}

export default new SocketService();
