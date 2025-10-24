import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ThrottlerGuard } from "@nestjs/throttler";
import { NotificationService } from "../services/notification.service";
import { PresenceService } from "../services/presence.service";
import { WsAuthDto, WsConnectionData } from "../dtos/ws-auth.dto";

@WebSocketGateway({
  namespace: "/ws/notifications",
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly rateLimitMap = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly presenceService: PresenceService
  ) {}

  afterInit(server: Server) {
    this.notificationService.setServer(server);
    this.logger.log("WebSocket Gateway initialized");
  }

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);

      // Extract JWT token from query or headers
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`No token provided for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        client.disconnect();
        return;
      }

      // Extract session ID
      const sessionId =
        (client.handshake.query.sessionId as string) ||
        this.generateSessionId();

      // Add user to presence service
      this.presenceService.addUser(
        client,
        payload.sub,
        payload.role,
        sessionId
      );

      // Join user-specific and role-specific rooms
      await client.join(`user:${payload.sub}`);
      await client.join(`role:${payload.role}`);
      await client.join(`session:${sessionId}`);

      // Store connection data
      const connectionData: WsConnectionData = {
        userId: payload.sub,
        role: payload.role,
        sessionId,
        socketId: client.id,
        connectedAt: new Date(),
      };

      client.data = connectionData;

      // Send welcome message
      client.emit("connected", {
        message: "Connected to notification service",
        userId: payload.sub,
        role: payload.role,
        sessionId,
      });

      this.logger.log(
        `User ${payload.sub} (${payload.role}) connected with socket ${client.id}`
      );
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const connectionData = client.data as WsConnectionData;

    if (connectionData) {
      this.presenceService.removeUser(client);
      this.logger.log(
        `User ${connectionData.userId} disconnected from socket ${client.id}`
      );
    } else {
      this.logger.log(`Unknown client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket) {
    // Update last seen
    this.presenceService.updateLastSeen(client.id);

    // Check rate limit
    if (!this.checkRateLimit(client.id)) {
      client.emit("error", { message: "Rate limit exceeded" });
      return;
    }

    client.emit("pong", { timestamp: new Date() });
  }

  @SubscribeMessage("joinRoom")
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit("error", { message: "Rate limit exceeded" });
      return;
    }

    const connectionData = client.data as WsConnectionData;
    if (!connectionData) {
      client.emit("error", { message: "Not authenticated" });
      return;
    }

    // Validate room name (prevent joining arbitrary rooms)
    const allowedRooms = [
      `user:${connectionData.userId}`,
      `role:${connectionData.role}`,
      `session:${connectionData.sessionId}`,
    ];

    if (allowedRooms.includes(data.room)) {
      client.join(data.room);
      client.emit("joinedRoom", { room: data.room });
    } else {
      client.emit("error", { message: "Unauthorized room access" });
    }
  }

  @SubscribeMessage("leaveRoom")
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit("error", { message: "Rate limit exceeded" });
      return;
    }

    client.leave(data.room);
    client.emit("leftRoom", { room: data.room });
  }

  @SubscribeMessage("getPresence")
  handleGetPresence(@ConnectedSocket() client: Socket) {
    if (!this.checkRateLimit(client.id)) {
      client.emit("error", { message: "Rate limit exceeded" });
      return;
    }

    const stats = this.presenceService.getPresenceStats();
    client.emit("presenceStats", stats);
  }

  @SubscribeMessage("markNotificationRead")
  handleMarkNotificationRead(
    @MessageBody() data: { notificationId: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!this.checkRateLimit(client.id)) {
      client.emit("error", { message: "Rate limit exceeded" });
      return;
    }

    // This would typically update the notification status in the database
    client.emit("notificationRead", { notificationId: data.notificationId });
  }

  // Helper methods
  private extractToken(client: Socket): string | null {
    // Try to get token from Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try to get token from query parameters
    const token = client.handshake.query.token as string;
    if (token) {
      return token;
    }

    // Try to get token from auth object
    const authToken = client.handshake.auth?.token as string;
    if (authToken) {
      return authToken;
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
      return payload;
    } catch (error) {
      this.logger.warn(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const windowMs = 5000; // 5 seconds
    const maxRequests = 10; // Max 10 requests per window

    const current = this.rateLimitMap.get(socketId);

    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(socketId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  }

  // Clean up rate limit map periodically
  private cleanupRateLimitMap() {
    const now = Date.now();
    for (const [socketId, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(socketId);
      }
    }
  }
}






























