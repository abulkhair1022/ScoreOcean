# WebSocket Real-Time Updates Implementation

## Overview

This document describes the WebSocket implementation for real-time updates in the Score Ocean platform.

## Features Implemented

### 1. WebSocket Server with Socket.io (Task 13.1)
- **Authentication**: JWT-based authentication for WebSocket connections
- **Connection Management**: Tracks user connections and socket IDs
- **Room-Based Subscriptions**: Support for match rooms, auction rooms, and tournament rooms
- **Multi-Server Support**: Redis pub/sub for broadcasting across multiple server instances

### 2. Score Broadcasting (Task 13.2)
- **Real-Time Score Updates**: Broadcasts score changes to all connected clients watching a match
- **Redis Caching**: Caches current match scores in Redis for quick retrieval
- **Score History**: Maintains a history of score updates with timestamps
- **Multi-Server Broadcasting**: Uses Redis pub/sub to broadcast across server instances

### 3. Reconnection Handling (Task 13.4)
- **Missed Updates Tracking**: Stores updates for offline users in Redis sorted sets
- **Sync on Reconnection**: Delivers all missed updates when a user reconnects
- **Concurrent Update Preservation**: Ensures no data loss during concurrent updates
- **Automatic Cleanup**: Removes delivered updates and expires old data

## Architecture

### WebSocket Service (`websocket.service.ts`)

The WebSocket service provides:
- Socket.io server initialization
- Authentication middleware
- Room subscription management
- Real-time broadcasting
- Redis pub/sub integration
- Missed update tracking

### Integration with Match Service

The match service integrates with WebSocket for:
- Broadcasting score updates when scores change
- Broadcasting match completion events
- Real-time notifications to participants

## Usage

### Client Connection

```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Subscribe to a match
socket.emit('subscribe:match', 'match-id');

// Listen for score updates
socket.on('score:update', (data) => {
  console.log('Score updated:', data);
});

// Handle reconnection
socket.on('connect', () => {
  socket.emit('reconnect:sync', {
    lastSyncTime: localStorage.getItem('lastSyncTime')
  });
});

socket.on('sync:updates', (data) => {
  console.log('Received missed updates:', data.updates);
  localStorage.setItem('lastSyncTime', data.syncTime);
});
```

### Server-Side Broadcasting

```typescript
import { websocketService } from './services/websocket.service';

// Broadcast score update
await websocketService.publishScoreUpdate('match-id', 'score:update', {
  matchId: 'match-id',
  score: { homeScore: 1, awayScore: 0 },
  timestamp: new Date().toISOString()
});

// Send notification to specific user
await websocketService.publishNotification('user-id', 'notification:new', {
  message: 'Your team won!'
});

// Broadcast auction update
await websocketService.publishAuctionUpdate('auction-id', 'bid:placed', {
  playerId: 'player-id',
  amount: 1000
});
```

## Redis Data Structures

### Missed Updates
```
Key: missed_updates:{userId}
Type: Sorted Set
Score: timestamp (milliseconds)
Value: JSON stringified update
TTL: 7 days
```

### Score Cache
```
Key: match:{matchId}:score
Type: Hash
Fields: homeScore, awayScore, status, lastUpdate, sportSpecificData
TTL: 7 days
```

### Score History
```
Key: match:{matchId}:history
Type: Sorted Set
Score: timestamp (milliseconds)
Value: JSON stringified score update
Limit: Last 100 updates
TTL: 7 days
```

### Connections
```
Key: connections:{userId}
Type: Set
Members: socketId1, socketId2, ...
TTL: 24 hours
```

## Events

### Client → Server
- `subscribe:match` - Subscribe to match updates
- `unsubscribe:match` - Unsubscribe from match updates
- `subscribe:auction` - Subscribe to auction updates
- `unsubscribe:auction` - Unsubscribe from auction updates
- `subscribe:tournament` - Subscribe to tournament updates
- `unsubscribe:tournament` - Unsubscribe from tournament updates
- `reconnect:sync` - Request missed updates since last sync

### Server → Client
- `score:update` - Real-time score update
- `match:completed` - Match finalization event
- `sync:updates` - Missed updates delivery
- `sync:complete` - No missed updates
- `sync:error` - Error syncing updates
- `match:subscribed` - Confirmation of match subscription
- `auction:subscribed` - Confirmation of auction subscription
- `tournament:subscribed` - Confirmation of tournament subscription

## Error Handling

The WebSocket service gracefully handles:
- Redis connection failures (falls back to single-server mode)
- WebSocket not initialized (logs warning, doesn't crash)
- Invalid authentication tokens (rejects connection)
- Network disconnections (automatic reconnection with sync)

## Testing

Tests are located in `src/services/__tests__/websocket.service.test.ts`

Run tests:
```bash
npm test -- --testPathPattern=websocket.service.test.ts
```

## Requirements Satisfied

- **Requirement 7.4**: Real-time score broadcasting to connected clients
- **Requirement 19.4**: WebSocket-based persistent connections
- **Requirement 19.5**: Missed update synchronization on reconnection
- **Requirement 19.6**: Concurrent update preservation without data loss
- **Requirement 21.5**: Real-time auction bid broadcasting

## Future Enhancements

- Add rate limiting for WebSocket events
- Implement connection pooling for high-traffic scenarios
- Add metrics and monitoring for WebSocket connections
- Implement compression for large payloads
- Add support for binary data transmission
