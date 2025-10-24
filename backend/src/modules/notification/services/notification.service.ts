import { Injectable, Logger } from "@nestjs/common";
import { Server } from "socket.io";
import { PresenceService } from "./presence.service";
import {
  FormatterService,
  BookingNotificationData,
  ReviewNotificationData,
  NearbyJobData,
} from "./formatter.service";
import { NotificationsLogRepo } from "../repos/notifications.log.repo";
import { WsEventPayload } from "../dtos/ws-auth.dto";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private server: Server;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly formatterService: FormatterService,
    private readonly logRepo: NotificationsLogRepo
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  async emitToUser(userId: string, event: string, payload: any): Promise<void> {
    try {
      const userSockets = this.presenceService.getUserSockets(userId);

      if (userSockets.length === 0) {
        this.logger.warn(`User ${userId} is not online, notification not sent`);
        await this.logRepo.logNotification(
          userId,
          event,
          payload,
          false,
          "User not online"
        );
        return;
      }

      const wsPayload: WsEventPayload = {
        event,
        data: payload,
        timestamp: new Date(),
        userId,
      };

      // Emit to all user's sockets
      for (const socketId of userSockets) {
        this.server.to(socketId).emit(event, wsPayload);
      }

      await this.logRepo.logNotification(userId, event, payload, true);
      this.logger.log(`Notification sent to user ${userId}: ${event}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${userId}:`,
        error
      );
      await this.logRepo.logNotification(
        userId,
        event,
        payload,
        false,
        error.message
      );
    }
  }

  async emitToRole(role: string, event: string, payload: any): Promise<void> {
    try {
      const roleSockets = this.presenceService.getRoleSockets(role);

      if (roleSockets.length === 0) {
        this.logger.warn(`No users with role ${role} are online`);
        return;
      }

      const wsPayload: WsEventPayload = {
        event,
        data: payload,
        timestamp: new Date(),
      };

      // Emit to all role sockets
      for (const socketId of roleSockets) {
        this.server.to(socketId).emit(event, wsPayload);
      }

      this.logger.log(`Notification sent to role ${role}: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to role ${role}:`, error);
    }
  }

  async emitNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    event: string,
    payload: any
  ): Promise<void> {
    try {
      // This would typically involve geofencing logic
      // For now, we'll emit to all online professionals
      const professionalSockets =
        this.presenceService.getRoleSockets("PROFESSIONAL");

      if (professionalSockets.length === 0) {
        this.logger.warn(
          "No professionals are online for nearby job notification"
        );
        return;
      }

      const wsPayload: WsEventPayload = {
        event,
        data: payload,
        timestamp: new Date(),
        metadata: {
          geofence: true,
          lat,
          lng,
          radiusKm,
        },
      };

      // Emit to all professional sockets
      for (const socketId of professionalSockets) {
        this.server.to(socketId).emit(event, wsPayload);
      }

      this.logger.log(
        `Nearby job notification sent to ${professionalSockets.length} professionals`
      );
    } catch (error) {
      this.logger.error("Failed to send nearby job notification:", error);
    }
  }

  // Specific notification methods
  async notifyBookingCreated(data: BookingNotificationData): Promise<void> {
    const payload = this.formatterService.formatBookingCreated(data);
    await this.emitToUser(data.professionalId, "booking.created", payload.data);
  }

  async notifyBookingAccepted(data: BookingNotificationData): Promise<void> {
    const payload = this.formatterService.formatBookingAccepted(data);
    await this.emitToUser(data.customerId, "booking.accepted", payload.data);
  }

  async notifyBookingRejected(
    data: BookingNotificationData & { reason: string }
  ): Promise<void> {
    const payload = this.formatterService.formatBookingRejected(data);
    await this.emitToUser(data.customerId, "booking.rejected", payload.data);
  }

  async notifyBookingReminder(data: BookingNotificationData): Promise<void> {
    const payload = this.formatterService.formatBookingReminder(data);
    await this.emitToUser(data.customerId, "booking.reminder", payload.data);
  }

  async notifyBookingCompleted(data: BookingNotificationData): Promise<void> {
    const payload = this.formatterService.formatBookingCompleted(data);
    await this.emitToUser(data.customerId, "booking.completed", payload.data);
  }

  async notifyReviewCreated(data: ReviewNotificationData): Promise<void> {
    const payload = this.formatterService.formatReviewCreated(data);
    await this.emitToUser(data.professionalId, "review.created", payload.data);
  }

  async notifyNearbyJob(data: NearbyJobData): Promise<void> {
    const payload = this.formatterService.formatNearbyJob(data);
    await this.emitNearby(data.lat, data.lng, 5, "nearby-job", payload.data);
  }

  // Admin notifications
  async notifyAdmin(event: string, message: string, data?: any): Promise<void> {
    const payload = this.formatterService.formatGenericNotification(
      event,
      "Admin Notification",
      message,
      "admin",
      data
    );
    await this.emitToRole("ADMIN", event, payload.data);
  }

  // System notifications
  async notifySystemMaintenance(message: string): Promise<void> {
    const payload = this.formatterService.formatGenericNotification(
      "system.maintenance",
      "System Maintenance",
      message,
      "system"
    );

    // Notify all online users
    const allUsers = this.presenceService.getOnlineUsers();
    for (const userId of allUsers) {
      await this.emitToUser(userId, "system.maintenance", payload.data);
    }
  }

  // Broadcast to all connected users
  async broadcast(event: string, payload: any): Promise<void> {
    try {
      const wsPayload: WsEventPayload = {
        event,
        data: payload,
        timestamp: new Date(),
      };

      this.server.emit(event, wsPayload);
      this.logger.log(`Broadcast sent: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to broadcast ${event}:`, error);
    }
  }

  // Get notification statistics
  async getNotificationStats(userId?: string) {
    return this.logRepo.getNotificationStats(userId);
  }

  // Get notification logs
  async getNotificationLogs(query: any) {
    return this.logRepo.getNotificationLogs(query);
  }
}
