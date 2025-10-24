import { Injectable } from "@nestjs/common";
import { WsEventPayload } from "../dtos/ws-auth.dto";

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  userId?: string;
  createdAt: Date;
  read?: boolean;
}

export interface BookingNotificationData {
  bookingId: string;
  customerId: string;
  professionalId: string;
  categoryId: string;
  status: string;
  scheduledAt: Date;
  addressText: string;
  lat?: number;
  lng?: number;
  details?: string;
  quotedPriceBDT: number;
}

export interface ReviewNotificationData {
  reviewId: string;
  bookingId: string;
  customerId: string;
  professionalId: string;
  rating: number;
  comment?: string;
  flagged: boolean;
}

export interface NearbyJobData {
  bookingId: string;
  customerId: string;
  categoryId: string;
  scheduledAt: Date;
  addressText: string;
  lat: number;
  lng: number;
  distance: number; // in km
  quotedPriceBDT: number;
  details?: string;
}

@Injectable()
export class FormatterService {
  formatBookingCreated(data: BookingNotificationData): WsEventPayload {
    return {
      event: "booking.created",
      data: {
        id: data.bookingId,
        type: "booking",
        title: "New Booking Request",
        message: `You have a new booking request for ${this.getCategoryName(
          data.categoryId
        )}`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          categoryId: data.categoryId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          details: data.details,
          quotedPriceBDT: data.quotedPriceBDT,
        },
        userId: data.professionalId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.professionalId,
      metadata: {
        priority: "high",
        category: "booking",
      },
    };
  }

  formatBookingAccepted(data: BookingNotificationData): WsEventPayload {
    return {
      event: "booking.accepted",
      data: {
        id: data.bookingId,
        type: "booking",
        title: "Booking Accepted",
        message: `Your booking request has been accepted by the professional`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          categoryId: data.categoryId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          details: data.details,
          quotedPriceBDT: data.quotedPriceBDT,
        },
        userId: data.customerId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.customerId,
      metadata: {
        priority: "high",
        category: "booking",
      },
    };
  }

  formatBookingRejected(
    data: BookingNotificationData & { reason: string }
  ): WsEventPayload {
    return {
      event: "booking.rejected",
      data: {
        id: data.bookingId,
        type: "booking",
        title: "Booking Rejected",
        message: `Your booking request has been rejected. ${
          data.reason ? `Reason: ${data.reason}` : ""
        }`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          categoryId: data.categoryId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          details: data.details,
          quotedPriceBDT: data.quotedPriceBDT,
          reason: data.reason,
        },
        userId: data.customerId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.customerId,
      metadata: {
        priority: "high",
        category: "booking",
      },
    };
  }

  formatBookingReminder(data: BookingNotificationData): WsEventPayload {
    const timeUntilBooking = this.getTimeUntilBooking(data.scheduledAt);

    return {
      event: "booking.reminder",
      data: {
        id: data.bookingId,
        type: "booking",
        title: "Booking Reminder",
        message: `Your booking is scheduled in ${timeUntilBooking}`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          categoryId: data.categoryId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          details: data.details,
          quotedPriceBDT: data.quotedPriceBDT,
        },
        userId: data.customerId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.customerId,
      metadata: {
        priority: "medium",
        category: "booking",
      },
    };
  }

  formatBookingCompleted(data: BookingNotificationData): WsEventPayload {
    return {
      event: "booking.completed",
      data: {
        id: data.bookingId,
        type: "booking",
        title: "Booking Completed",
        message: `Your booking has been completed successfully`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          categoryId: data.categoryId,
          status: data.status,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          details: data.details,
          quotedPriceBDT: data.quotedPriceBDT,
        },
        userId: data.customerId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.customerId,
      metadata: {
        priority: "high",
        category: "booking",
      },
    };
  }

  formatReviewCreated(data: ReviewNotificationData): WsEventPayload {
    return {
      event: "review.created",
      data: {
        id: data.reviewId,
        type: "review",
        title: "New Review Received",
        message: `You received a ${data.rating}-star review${
          data.comment
            ? `: "${data.comment.substring(0, 50)}${
                data.comment.length > 50 ? "..." : ""
              }"`
            : ""
        }`,
        data: {
          reviewId: data.reviewId,
          bookingId: data.bookingId,
          customerId: data.customerId,
          professionalId: data.professionalId,
          rating: data.rating,
          comment: data.comment,
          flagged: data.flagged,
        },
        userId: data.professionalId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId: data.professionalId,
      metadata: {
        priority: "medium",
        category: "review",
      },
    };
  }

  formatNearbyJob(data: NearbyJobData): WsEventPayload {
    return {
      event: "nearby-job",
      data: {
        id: data.bookingId,
        type: "job",
        title: "Nearby Job Available",
        message: `New job available ${data.distance.toFixed(
          1
        )}km away - ${this.getCategoryName(data.categoryId)}`,
        data: {
          bookingId: data.bookingId,
          customerId: data.customerId,
          categoryId: data.categoryId,
          scheduledAt: data.scheduledAt,
          addressText: data.addressText,
          lat: data.lat,
          lng: data.lng,
          distance: data.distance,
          quotedPriceBDT: data.quotedPriceBDT,
          details: data.details,
        },
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      metadata: {
        priority: "high",
        category: "job",
        geofence: true,
      },
    };
  }

  formatGenericNotification(
    type: string,
    title: string,
    message: string,
    userId: string,
    data?: any
  ): WsEventPayload {
    return {
      event: type,
      data: {
        id: this.generateId(),
        type,
        title,
        message,
        data,
        userId,
        createdAt: new Date(),
        read: false,
      },
      timestamp: new Date(),
      userId,
      metadata: {
        priority: "medium",
        category: "general",
      },
    };
  }

  private getTimeUntilBooking(scheduledAt: Date): string {
    const now = new Date();
    const diffMs = scheduledAt.getTime() - now.getTime();

    if (diffMs < 0) {
      return "now";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${
        diffHours > 1 ? "s" : ""
      } and ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    } else {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    }
  }

  private getCategoryName(categoryId: string): string {
    // This would typically fetch from a service or cache
    // For now, return a placeholder
    const categoryMap: Record<string, string> = {
      plumbing: "Plumbing",
      electrical: "Electrical",
      cleaning: "Home Cleaning",
      repair: "Home Repair",
      maintenance: "Maintenance",
    };

    return categoryMap[categoryId] || "Service";
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
