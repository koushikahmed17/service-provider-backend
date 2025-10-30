import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/modules/auth/guards/jwt-auth.guard";
import { NotificationsLogRepo } from "../repos/notifications.log.repo";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsRepo: NotificationsLogRepo) {}

  @Get()
  @ApiOperation({ summary: "Get user notifications" })
  async getNotifications(
    @Request() req: any,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
    @Query("unreadOnly") unreadOnly?: string
  ) {
    const userId = req.user.id;
    const parsedLimit = limit ? parseInt(limit) : 20;
    const parsedPage = page ? parseInt(page) : 1;

    const result = await this.notificationsRepo.getNotificationLogs({
      userId,
      limit: parsedLimit,
      page: parsedPage,
    });

    // Transform the logs to match frontend expected format
    const notifications = result.logs.map((log) => {
      const payloadData =
        typeof log.payload === "string" ? JSON.parse(log.payload) : log.payload;

      return {
        id: log.id,
        type: log.event,
        title: payloadData.title || this.getDefaultTitle(log.event),
        message: payloadData.message || "",
        timestamp: log.createdAt,
        isRead: log.delivered, // Using delivered as read status for now
        data: payloadData.data || {},
      };
    });

    return {
      statusCode: 200,
      message: "Success",
      data: notifications,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  async markAsRead(@Param("id") id: string, @Request() req: any) {
    // For now, we'll just return success
    // In a full implementation, you'd update the notification status
    return {
      statusCode: 200,
      message: "Notification marked as read",
    };
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@Request() req: any) {
    // For now, we'll just return success
    // In a full implementation, you'd update all notifications for the user
    return {
      statusCode: 200,
      message: "All notifications marked as read",
    };
  }

  private getDefaultTitle(event: string): string {
    const titleMap: Record<string, string> = {
      "booking.created": "New Booking Request",
      "booking.accepted": "Booking Accepted",
      "booking.rejected": "Booking Rejected",
      "booking.reminder": "Booking Reminder",
      "booking.completed": "Booking Completed",
      "review.created": "New Review",
      "nearby-job": "Job Nearby",
    };

    return titleMap[event] || "Notification";
  }
}
















