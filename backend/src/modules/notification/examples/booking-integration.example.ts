// Example: How to integrate notifications with existing modules
// This file shows how to use the notification system in booking and review modules

import { Injectable } from "@nestjs/common";
import { NotificationService } from "../services/notification.service";
import {
  BookingNotificationData,
  ReviewNotificationData,
} from "../services/formatter.service";

@Injectable()
export class BookingNotificationIntegration {
  constructor(private readonly notificationService: NotificationService) {}

  // Example: In booking.service.ts - after creating a booking
  async handleBookingCreated(booking: any) {
    const notificationData: BookingNotificationData = {
      bookingId: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      quotedPriceBDT: booking.quotedPriceBDT,
    };

    // Send notification to professional
    await this.notificationService.notifyBookingCreated(notificationData);

    // Send nearby job notification to other professionals
    const nearbyJobData = {
      bookingId: booking.id,
      customerId: booking.customerId,
      categoryId: booking.categoryId,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      distance: 0, // Will be calculated by geofencing service
      quotedPriceBDT: booking.quotedPriceBDT,
      details: booking.details,
    };

    await this.notificationService.notifyNearbyJob(nearbyJobData);
  }

  // Example: In booking.service.ts - after accepting a booking
  async handleBookingAccepted(booking: any) {
    const notificationData: BookingNotificationData = {
      bookingId: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      quotedPriceBDT: booking.quotedPriceBDT,
    };

    await this.notificationService.notifyBookingAccepted(notificationData);
  }

  // Example: In booking.service.ts - after completing a booking
  async handleBookingCompleted(booking: any) {
    const notificationData: BookingNotificationData = {
      bookingId: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      quotedPriceBDT: booking.quotedPriceBDT,
    };

    await this.notificationService.notifyBookingCompleted(notificationData);
  }

  // Example: In review.service.ts - after creating a review
  async handleReviewCreated(review: any) {
    const notificationData: ReviewNotificationData = {
      reviewId: review.id,
      bookingId: review.bookingId,
      customerId: review.customerId,
      professionalId: review.professionalId,
      rating: review.rating,
      comment: review.comment,
      flagged: review.flagged,
    };

    await this.notificationService.notifyReviewCreated(notificationData);
  }

  // Example: Send booking reminder (could be called by a cron job)
  async sendBookingReminder(booking: any) {
    const notificationData: BookingNotificationData = {
      bookingId: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      quotedPriceBDT: booking.quotedPriceBDT,
    };

    await this.notificationService.notifyBookingReminder(notificationData);
  }

  // Example: Send system maintenance notification
  async sendSystemMaintenance(message: string) {
    await this.notificationService.notifySystemMaintenance(message);
  }

  // Example: Send admin notification
  async sendAdminNotification(event: string, message: string, data?: any) {
    await this.notificationService.notifyAdmin(event, message, data);
  }
}

// Example: How to add to existing modules
/*
// In booking.module.ts
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    // ... other imports
    NotificationModule, // Add this
  ],
  // ... rest of module
})
export class BookingModule {}

// In booking.service.ts
import { NotificationService } from '../notification/services/notification.service';

@Injectable()
export class BookingService {
  constructor(
    // ... other dependencies
    private readonly notificationService: NotificationService, // Add this
  ) {}

  async createBooking(createBookingDto: CreateBookingDto, customerId: string) {
    // ... existing booking creation logic
    
    // After booking is created, send notification
    await this.notificationService.notifyBookingCreated({
      bookingId: booking.id,
      customerId: booking.customerId,
      professionalId: booking.professionalId,
      categoryId: booking.categoryId,
      status: booking.status,
      scheduledAt: booking.scheduledAt,
      addressText: booking.addressText,
      lat: booking.lat,
      lng: booking.lng,
      details: booking.details,
      quotedPriceBDT: booking.quotedPriceBDT,
    });
    
    return booking;
  }
}
*/































