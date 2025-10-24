# Real-Time Notification System

This document describes the real-time notification system implemented using NestJS, Socket.IO, and Server-Sent Events (SSE).

## Overview

The notification system provides real-time communication between the backend and frontend clients through two main channels:

1. **WebSocket (Primary)** - Full-duplex communication using Socket.IO
2. **Server-Sent Events (SSE)** - Fallback for environments that don't support WebSockets

## Features

- ✅ JWT-based authentication for WebSocket connections
- ✅ User and role-based room management
- ✅ Presence tracking (online/offline users)
- ✅ Rate limiting per connection
- ✅ Notification logging and statistics
- ✅ Geofencing support for nearby job notifications
- ✅ SSE fallback for WebSocket-incompatible environments
- ✅ Comprehensive testing coverage

## Architecture

### Core Components

```
src/modules/notification/
├── gateway/
│   └── notifications.gateway.ts      # WebSocket gateway
├── services/
│   ├── notification.service.ts       # Main notification service
│   ├── presence.service.ts           # User presence tracking
│   └── formatter.service.ts          # Notification payload formatting
├── controllers/
│   └── notifications.sse.controller.ts # SSE fallback controller
├── dtos/
│   └── ws-auth.dto.ts                # WebSocket authentication DTOs
├── repos/
│   └── notifications.log.repo.ts     # Notification logging repository
└── notification.module.ts            # Module configuration
```

### Database Schema

```sql
-- Notification logs table
CREATE TABLE notification_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL, -- JSON string
    delivered BOOLEAN DEFAULT FALSE,
    delivered_at TIMESTAMP NULL,
    error TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## WebSocket Connection

### Connection URL

```
ws://localhost:3000/ws/notifications
```

### Authentication

The WebSocket connection supports JWT authentication through multiple methods:

1. **Authorization Header** (Recommended)

   ```javascript
   const socket = io("ws://localhost:3000/ws/notifications", {
     extraHeaders: {
       Authorization: "Bearer your-jwt-token",
     },
   });
   ```

2. **Query Parameter**

   ```javascript
   const socket = io(
     "ws://localhost:3000/ws/notifications?token=your-jwt-token"
   );
   ```

3. **Auth Object**
   ```javascript
   const socket = io("ws://localhost:3000/ws/notifications", {
     auth: {
       token: "your-jwt-token",
     },
   });
   ```

### Room Management

Upon connection, clients are automatically joined to:

- `user:{userId}` - User-specific notifications
- `role:{role}` - Role-based notifications (CUSTOMER, PROFESSIONAL, ADMIN)
- `session:{sessionId}` - Session-specific notifications

### Client Events

#### Outgoing (Client → Server)

- `ping` - Keep connection alive
- `joinRoom` - Join a specific room
- `leaveRoom` - Leave a room
- `getPresence` - Get online user statistics
- `markNotificationRead` - Mark notification as read

#### Incoming (Server → Client)

- `connected` - Connection established
- `pong` - Response to ping
- `joinedRoom` - Successfully joined room
- `leftRoom` - Successfully left room
- `presenceStats` - Online user statistics
- `notificationRead` - Notification marked as read
- `error` - Error message
- `heartbeat` - Keep-alive message

#### Notification Events

- `booking.created` - New booking request
- `booking.accepted` - Booking accepted by professional
- `booking.reminder` - Booking reminder
- `booking.completed` - Booking completed
- `review.created` - New review received
- `nearby-job` - Nearby job available
- `system.maintenance` - System maintenance notification

## Server-Sent Events (SSE)

### Connection URL

```
GET /notifications/sse
```

### Authentication

```bash
curl -H "Authorization: Bearer your-jwt-token" \
     -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     http://localhost:3000/notifications/sse
```

### Test Connection

```bash
curl -H "Accept: text/event-stream" \
     -H "Cache-Control: no-cache" \
     http://localhost:3000/notifications/sse/test
```

## Frontend Integration

### WebSocket Client (Socket.IO)

```javascript
import io from "socket.io-client";

class NotificationService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    this.socket = io("ws://localhost:3000/ws/notifications", {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    this.socket.on("connect", () => {
      console.log("Connected to notification service");
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from notification service");
      this.isConnected = false;
    });

    // Listen for notification events
    this.socket.on("booking.created", this.handleBookingCreated);
    this.socket.on("review.created", this.handleReviewCreated);
    this.socket.on("nearby-job", this.handleNearbyJob);
  }

  handleBookingCreated(data) {
    console.log("New booking:", data);
    // Show notification to user
  }

  handleReviewCreated(data) {
    console.log("New review:", data);
    // Show notification to user
  }

  handleNearbyJob(data) {
    console.log("Nearby job:", data);
    // Show notification to user
  }

  // Send ping to keep connection alive
  ping() {
    if (this.socket) {
      this.socket.emit("ping");
    }
  }

  // Join specific room
  joinRoom(room) {
    if (this.socket) {
      this.socket.emit("joinRoom", { room });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage
const notificationService = new NotificationService();
notificationService.connect("your-jwt-token");

// Keep connection alive
setInterval(() => {
  notificationService.ping();
}, 30000);
```

### SSE Client (EventSource)

```javascript
class SSENotificationService {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
  }

  connect(token) {
    const url = `http://localhost:3000/notifications/sse?token=${token}`;

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log("SSE connection opened");
      this.isConnected = true;
    };

    this.eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      this.isConnected = false;
    };

    // Listen for notification events
    this.eventSource.addEventListener(
      "booking.created",
      this.handleBookingCreated
    );
    this.eventSource.addEventListener(
      "review.created",
      this.handleReviewCreated
    );
    this.eventSource.addEventListener("nearby-job", this.handleNearbyJob);
  }

  handleBookingCreated(event) {
    const data = JSON.parse(event.data);
    console.log("New booking:", data);
  }

  handleReviewCreated(event) {
    const data = JSON.parse(event.data);
    console.log("New review:", data);
  }

  handleNearbyJob(event) {
    const data = JSON.parse(event.data);
    console.log("Nearby job:", data);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}

// Usage
const sseService = new SSENotificationService();
sseService.connect("your-jwt-token");
```

## API Endpoints

### SSE Endpoints

- `GET /notifications/sse` - Connect to SSE stream
- `GET /notifications/sse/test` - Test SSE connection (no auth required)

### Admin Endpoints

- `GET /admin/notifications/logs` - Get notification logs
- `GET /admin/notifications/stats` - Get notification statistics
- `POST /admin/notifications/broadcast` - Broadcast system message

### Dev Endpoints

- `POST /dev/notifications/test` - Send test notification

## Configuration

### Environment Variables

```env
# WebSocket Configuration
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=5000
RATE_LIMIT_MAX_REQUESTS=10

# SSE Configuration
SSE_HEARTBEAT_INTERVAL=30000
SSE_CLEANUP_INTERVAL=300000
```

### Module Configuration

```typescript
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "7d",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsSseController],
  providers: [
    NotificationsGateway,
    NotificationService,
    PresenceService,
    FormatterService,
    NotificationsLogRepo,
  ],
  exports: [NotificationService, PresenceService, FormatterService],
})
export class NotificationModule {}
```

## Testing

### Unit Tests

```bash
# Run notification service tests
npm test -- --testPathPatterns="notification"

# Run presence service tests
npm test -- --testPathPatterns="presence"

# Run all notification module tests
npm test -- --testPathPatterns="notification|presence"
```

### E2E Tests

```bash
# Run WebSocket e2e tests
npm run test:e2e -- --testPathPatterns="notification"

# Run SSE e2e tests
npm run test:e2e -- --testPathPatterns="sse"
```

### Manual Testing

1. **WebSocket Connection**

   ```bash
   # Install wscat
   npm install -g wscat

   # Connect with JWT token
   wscat -c "ws://localhost:3000/ws/notifications?token=your-jwt-token"
   ```

2. **SSE Connection**
   ```bash
   curl -H "Authorization: Bearer your-jwt-token" \
        -H "Accept: text/event-stream" \
        -H "Cache-Control: no-cache" \
        http://localhost:3000/notifications/sse
   ```

## Postman Collection

The notification system includes a comprehensive Postman collection at `postman/notifications.json` with:

- WebSocket connection instructions
- SSE connection examples
- Test notification endpoints
- Admin monitoring endpoints
- Complete API documentation

## Monitoring and Logging

### Notification Logs

All notifications are logged to the `notification_logs` table with:

- User ID
- Event type
- Payload data
- Delivery status
- Error messages
- Timestamps

### Presence Statistics

Real-time presence tracking provides:

- Total online users
- Users by role
- Socket connections per user
- Session information

### Health Checks

- WebSocket connection health
- SSE connection health
- Rate limiting status
- Memory usage for presence tracking

## Security Considerations

1. **JWT Authentication** - All connections require valid JWT tokens
2. **Rate Limiting** - Per-connection rate limiting prevents abuse
3. **Room Validation** - Users can only join authorized rooms
4. **Payload Validation** - All notification payloads are validated
5. **CORS Configuration** - Proper CORS settings for cross-origin requests

## Performance Considerations

1. **Connection Pooling** - Efficient socket connection management
2. **Memory Management** - Automatic cleanup of inactive sessions
3. **Rate Limiting** - Prevents connection flooding
4. **Payload Size Limits** - Prevents oversized notifications
5. **Heartbeat Mechanism** - Keeps connections alive efficiently

## Troubleshooting

### Common Issues

1. **Connection Refused**

   - Check if the server is running
   - Verify the WebSocket URL
   - Check CORS configuration

2. **Authentication Failed**

   - Verify JWT token is valid
   - Check token expiration
   - Ensure proper token format

3. **Notifications Not Received**

   - Check if user is online
   - Verify room membership
   - Check notification logs

4. **SSE Connection Drops**
   - Check network stability
   - Verify server is running
   - Check for proxy/firewall issues

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

This will provide detailed logs for:

- Connection events
- Authentication attempts
- Notification delivery
- Error messages

## Future Enhancements

1. **Redis Integration** - For distributed presence tracking
2. **Push Notifications** - Mobile push notification support
3. **Message Queuing** - Reliable message delivery
4. **Analytics Dashboard** - Real-time notification analytics
5. **Custom Events** - User-defined notification events
6. **Message History** - Persistent notification history
7. **Delivery Confirmation** - Read receipts and delivery status






























