import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { WsEventPayload } from "../dtos/ws-auth.dto";

export interface NotificationLog {
  id: string;
  userId: string;
  event: string;
  payload: any;
  delivered: boolean;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
}

export interface NotificationLogQuery {
  userId?: string;
  event?: string;
  delivered?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class NotificationsLogRepo {
  constructor(private readonly prisma: PrismaService) {}

  async logNotification(
    userId: string,
    event: string,
    payload: any,
    delivered: boolean = false,
    error?: string
  ): Promise<NotificationLog> {
    const log = await this.prisma.notificationLog.create({
      data: {
        userId,
        event,
        payload: JSON.stringify(payload),
        delivered,
        deliveredAt: delivered ? new Date() : null,
        error,
      },
    });

    return {
      id: log.id,
      userId: log.userId,
      event: log.event,
      payload: JSON.parse(log.payload),
      delivered: log.delivered,
      deliveredAt: log.deliveredAt,
      error: log.error,
      createdAt: log.createdAt,
    };
  }

  async getNotificationLogs(query: NotificationLogQuery): Promise<{
    logs: NotificationLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      userId,
      event,
      delivered,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (event) {
      whereClause.event = event;
    }

    if (delivered !== undefined) {
      whereClause.delivered = delivered;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = startDate;
      }
      if (endDate) {
        whereClause.createdAt.lte = endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notificationLog.count({ where: whereClause }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        event: log.event,
        payload: JSON.parse(log.payload),
        delivered: log.delivered,
        deliveredAt: log.deliveredAt,
        error: log.error,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getNotificationStats(userId?: string): Promise<{
    total: number;
    delivered: number;
    failed: number;
    byEvent: Record<string, number>;
    byDay: Array<{ date: string; count: number }>;
  }> {
    const whereClause = userId ? { userId } : {};

    const [total, delivered, failed, byEvent, byDay] = await Promise.all([
      this.prisma.notificationLog.count({ where: whereClause }),
      this.prisma.notificationLog.count({
        where: { ...whereClause, delivered: true },
      }),
      this.prisma.notificationLog.count({
        where: { ...whereClause, delivered: false },
      }),
      this.prisma.notificationLog.groupBy({
        by: ["event"],
        where: whereClause,
        _count: { event: true },
      }),
      this.prisma.notificationLog.groupBy({
        by: ["createdAt"],
        where: {
          ...whereClause,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: { createdAt: true },
      }),
    ]);

    const eventStats: Record<string, number> = {};
    byEvent.forEach((item) => {
      eventStats[item.event] = item._count.event;
    });

    const dayStats = byDay.map((item) => ({
      date: item.createdAt.toISOString().split("T")[0],
      count: item._count.createdAt,
    }));

    return {
      total,
      delivered,
      failed,
      byEvent: eventStats,
      byDay: dayStats,
    };
  }

  async markAsDelivered(logId: string): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        delivered: true,
        deliveredAt: new Date(),
      },
    });
  }

  async markAsFailed(logId: string, error: string): Promise<void> {
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        delivered: false,
        error,
      },
    });
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notificationLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}































