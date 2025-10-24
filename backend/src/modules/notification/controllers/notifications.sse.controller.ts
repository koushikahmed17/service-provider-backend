import {
  Controller,
  Get,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Response, Request } from "express";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { NotificationService } from "../services/notification.service";
import { PresenceService } from "../services/presence.service";

interface SSEClient {
  id: string;
  userId: string;
  role: string;
  response: Response;
  lastPing: Date;
}

@Controller("notifications")
export class NotificationsSseController {
  private readonly logger = new Logger(NotificationsSseController.name);
  private readonly sseClients = new Map<string, SSEClient>();
  private readonly heartbeatInterval: NodeJS.Timeout;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly presenceService: PresenceService
  ) {
    // Send heartbeat every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  @Get("sse")
  async sse(@Res() res: Response, @Req() req: Request) {
    try {
      // Extract JWT token from Authorization header or query
      const token = this.extractToken(req);
      if (!token) {
        throw new UnauthorizedException("No authentication token provided");
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      if (!payload) {
        throw new UnauthorizedException("Invalid authentication token");
      }

      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Cache-Control");

      // Create client ID
      const clientId = `sse_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store client
      const sseClient: SSEClient = {
        id: clientId,
        userId: payload.sub,
        role: payload.role,
        response: res,
        lastPing: new Date(),
      };

      this.sseClients.set(clientId, sseClient);

      // Send initial connection message
      this.sendSSEMessage(res, "connected", {
        message: "Connected to notification service via SSE",
        userId: payload.sub,
        role: payload.role,
        clientId,
        timestamp: new Date(),
      });

      // Set up notification listener for this user
      this.setupUserNotificationListener(sseClient);

      this.logger.log(
        `SSE client connected: ${clientId} for user ${payload.sub} (${payload.role})`
      );

      // Handle client disconnect
      req.on("close", () => {
        this.sseClients.delete(clientId);
        this.logger.log(`SSE client disconnected: ${clientId}`);
      });

      req.on("error", (error) => {
        this.logger.error(`SSE client error: ${clientId}`, error);
        this.sseClients.delete(clientId);
      });
    } catch (error) {
      this.logger.error("SSE connection error:", error);
      res.status(401).json({ error: "Authentication failed" });
    }
  }

  @Get("sse/test")
  async testSse(@Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send test messages every 5 seconds
    const interval = setInterval(() => {
      this.sendSSEMessage(res, "test", {
        message: "Test notification",
        timestamp: new Date(),
      });
    }, 5000);

    // Clean up after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      this.sendSSEMessage(res, "test-complete", {
        message: "Test completed",
        timestamp: new Date(),
      });
      res.end();
    }, 30000);
  }

  private setupUserNotificationListener(client: SSEClient) {
    // This would typically set up a listener for user-specific notifications
    // For now, we'll simulate with a simple interval
    const interval = setInterval(() => {
      if (!this.sseClients.has(client.id)) {
        clearInterval(interval);
        return;
      }

      // Send a ping to keep connection alive
      this.sendSSEMessage(client.response, "ping", {
        timestamp: new Date(),
      });
    }, 60000); // Every minute
  }

  private sendSSEMessage(res: Response, event: string, data: any) {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
    } catch (error) {
      this.logger.error("Failed to send SSE message:", error);
    }
  }

  private sendHeartbeat() {
    const now = new Date();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.sseClients.entries()) {
      try {
        // Send heartbeat
        this.sendSSEMessage(client.response, "heartbeat", {
          timestamp: now,
        });

        // Check if client is stale (no ping for 5 minutes)
        const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
        if (timeSinceLastPing > 5 * 60 * 1000) {
          staleClients.push(clientId);
        }
      } catch (error) {
        this.logger.error(
          `Failed to send heartbeat to client ${clientId}:`,
          error
        );
        staleClients.push(clientId);
      }
    }

    // Remove stale clients
    for (const clientId of staleClients) {
      this.sseClients.delete(clientId);
      this.logger.log(`Removed stale SSE client: ${clientId}`);
    }
  }

  private extractToken(req: Request): string | null {
    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }

    // Try query parameter
    const token = req.query.token as string;
    if (token) {
      return token;
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

  // Method to send notification to specific SSE client
  public sendNotificationToClient(userId: string, event: string, data: any) {
    for (const [clientId, client] of this.sseClients.entries()) {
      if (client.userId === userId) {
        try {
          this.sendSSEMessage(client.response, event, data);
          client.lastPing = new Date();
        } catch (error) {
          this.logger.error(
            `Failed to send notification to client ${clientId}:`,
            error
          );
          this.sseClients.delete(clientId);
        }
      }
    }
  }

  // Method to broadcast to all SSE clients
  public broadcastToAllClients(event: string, data: any) {
    for (const [clientId, client] of this.sseClients.entries()) {
      try {
        this.sendSSEMessage(client.response, event, data);
        client.lastPing = new Date();
      } catch (error) {
        this.logger.error(`Failed to broadcast to client ${clientId}:`, error);
        this.sseClients.delete(clientId);
      }
    }
  }

  // Method to broadcast to clients by role
  public broadcastToRole(role: string, event: string, data: any) {
    for (const [clientId, client] of this.sseClients.entries()) {
      if (client.role === role) {
        try {
          this.sendSSEMessage(client.response, event, data);
          client.lastPing = new Date();
        } catch (error) {
          this.logger.error(
            `Failed to send role notification to client ${clientId}:`,
            error
          );
          this.sseClients.delete(clientId);
        }
      }
    }
  }

  // Get SSE client statistics
  public getSSEStats() {
    const stats = {
      totalClients: this.sseClients.size,
      clientsByRole: {} as Record<string, number>,
      clientsByUser: {} as Record<string, number>,
    };

    for (const client of this.sseClients.values()) {
      stats.clientsByRole[client.role] =
        (stats.clientsByRole[client.role] || 0) + 1;
      stats.clientsByUser[client.userId] =
        (stats.clientsByUser[client.userId] || 0) + 1;
    }

    return stats;
  }
}






























