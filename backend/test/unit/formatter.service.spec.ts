import { Test, TestingModule } from "@nestjs/testing";
import { FormatterService } from "@/modules/notification/services/formatter.service";

describe("FormatterService", () => {
  let service: FormatterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormatterService],
    }).compile();

    service = module.get<FormatterService>(FormatterService);
  });

  describe("formatBookingCreated", () => {
    it("should format booking created notification correctly", () => {
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "PENDING",
        scheduledAt: new Date("2024-01-20T10:00:00Z"),
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        details: "Kitchen sink repair needed",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingCreated(bookingData);

      expect(result.event).toBe("booking.created");
      expect(result.data.id).toBe("booking-123");
      expect(result.data.type).toBe("booking");
      expect(result.data.title).toBe("New Booking Request");
      expect(result.data.message).toContain("Plumbing");
      expect(result.data.userId).toBe("professional-123");
      expect(result.data.data.bookingId).toBe("booking-123");
      expect(result.data.data.quotedPriceBDT).toBe(2000.0);
      expect(result.metadata.priority).toBe("high");
      expect(result.metadata.category).toBe("booking");
    });
  });

  describe("formatBookingAccepted", () => {
    it("should format booking accepted notification correctly", () => {
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "ACCEPTED",
        scheduledAt: new Date("2024-01-20T10:00:00Z"),
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        details: "Kitchen sink repair needed",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingAccepted(bookingData);

      expect(result.event).toBe("booking.accepted");
      expect(result.data.id).toBe("booking-123");
      expect(result.data.type).toBe("booking");
      expect(result.data.title).toBe("Booking Accepted");
      expect(result.data.message).toContain("accepted by the professional");
      expect(result.data.userId).toBe("customer-123");
      expect(result.metadata.priority).toBe("high");
    });
  });

  describe("formatBookingReminder", () => {
    it("should format booking reminder notification correctly", () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "ACCEPTED",
        scheduledAt: futureDate,
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        details: "Kitchen sink repair needed",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingReminder(bookingData);

      expect(result.event).toBe("booking.reminder");
      expect(result.data.id).toBe("booking-123");
      expect(result.data.type).toBe("booking");
      expect(result.data.title).toBe("Booking Reminder");
      expect(result.data.message).toContain("scheduled in");
      expect(result.data.userId).toBe("customer-123");
      expect(result.metadata.priority).toBe("medium");
    });

    it("should handle past scheduled time", () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "ACCEPTED",
        scheduledAt: pastDate,
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        details: "Kitchen sink repair needed",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingReminder(bookingData);

      expect(result.data.message).toContain("now");
    });
  });

  describe("formatBookingCompleted", () => {
    it("should format booking completed notification correctly", () => {
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "COMPLETED",
        scheduledAt: new Date("2024-01-20T10:00:00Z"),
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        details: "Kitchen sink repair needed",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingCompleted(bookingData);

      expect(result.event).toBe("booking.completed");
      expect(result.data.id).toBe("booking-123");
      expect(result.data.type).toBe("booking");
      expect(result.data.title).toBe("Booking Completed");
      expect(result.data.message).toContain("completed successfully");
      expect(result.data.userId).toBe("customer-123");
      expect(result.metadata.priority).toBe("high");
    });
  });

  describe("formatReviewCreated", () => {
    it("should format review created notification with comment", () => {
      const reviewData = {
        reviewId: "review-123",
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        rating: 5,
        comment: "Excellent service! Very professional and punctual.",
        flagged: false,
      };

      const result = service.formatReviewCreated(reviewData);

      expect(result.event).toBe("review.created");
      expect(result.data.id).toBe("review-123");
      expect(result.data.type).toBe("review");
      expect(result.data.title).toBe("New Review Received");
      expect(result.data.message).toContain("5-star review");
      expect(result.data.message).toContain("Excellent service!");
      expect(result.data.userId).toBe("professional-123");
      expect(result.metadata.priority).toBe("medium");
    });

    it("should format review created notification without comment", () => {
      const reviewData = {
        reviewId: "review-123",
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        rating: 4,
        comment: undefined,
        flagged: false,
      };

      const result = service.formatReviewCreated(reviewData);

      expect(result.data.message).toContain("4-star review");
      expect(result.data.message).not.toContain(":");
    });

    it("should truncate long comments", () => {
      const longComment =
        "This is a very long comment that should be truncated because it exceeds the maximum length allowed for display in the notification message. It should be cut off at 50 characters and have ellipsis added.";
      const reviewData = {
        reviewId: "review-123",
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        rating: 5,
        comment: longComment,
        flagged: false,
      };

      const result = service.formatReviewCreated(reviewData);

      expect(result.data.message).toContain("...");
      expect(result.data.message.length).toBeLessThan(longComment.length + 50);
    });
  });

  describe("formatNearbyJob", () => {
    it("should format nearby job notification correctly", () => {
      const jobData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        categoryId: "plumbing",
        scheduledAt: new Date("2024-01-20T10:00:00Z"),
        addressText: "123 Test Street, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        distance: 2.5,
        quotedPriceBDT: 2000.0,
        details: "Kitchen sink repair needed",
      };

      const result = service.formatNearbyJob(jobData);

      expect(result.event).toBe("nearby-job");
      expect(result.data.id).toBe("booking-123");
      expect(result.data.type).toBe("job");
      expect(result.data.title).toBe("Nearby Job Available");
      expect(result.data.message).toContain("2.5km away");
      expect(result.data.message).toContain("Plumbing");
      expect(result.data.data.distance).toBe(2.5);
      expect(result.metadata.priority).toBe("high");
      expect(result.metadata.geofence).toBe(true);
    });
  });

  describe("formatGenericNotification", () => {
    it("should format generic notification correctly", () => {
      const result = service.formatGenericNotification(
        "test.event",
        "Test Title",
        "Test message",
        "user-123",
        { testData: "value" }
      );

      expect(result.event).toBe("test.event");
      expect(result.data.id).toMatch(/^notif_\d+_[a-z0-9]+$/);
      expect(result.data.type).toBe("test.event");
      expect(result.data.title).toBe("Test Title");
      expect(result.data.message).toBe("Test message");
      expect(result.data.userId).toBe("user-123");
      expect(result.data.data).toEqual({ testData: "value" });
      expect(result.userId).toBe("user-123");
      expect(result.metadata.priority).toBe("medium");
      expect(result.metadata.category).toBe("general");
    });
  });

  describe("getTimeUntilBooking", () => {
    it("should format time correctly for different time ranges", () => {
      const now = new Date();

      // Test with 2 hours from now
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "ACCEPTED",
        scheduledAt: twoHoursFromNow,
        addressText: "123 Test Street, Dhaka",
        quotedPriceBDT: 2000.0,
      };

      const result = service.formatBookingReminder(bookingData);
      expect(result.data.message).toContain("2 hour");
    });
  });

  describe("getCategoryName", () => {
    it("should return correct category names", () => {
      const testCases = [
        { input: "plumbing", expected: "Plumbing" },
        { input: "electrical", expected: "Electrical" },
        { input: "cleaning", expected: "Home Cleaning" },
        { input: "repair", expected: "Home Repair" },
        { input: "maintenance", expected: "Maintenance" },
        { input: "unknown", expected: "Service" },
      ];

      testCases.forEach(({ input, expected }) => {
        const bookingData = {
          bookingId: "booking-123",
          customerId: "customer-123",
          professionalId: "professional-123",
          categoryId: input,
          status: "PENDING",
          scheduledAt: new Date(),
          addressText: "123 Test Street, Dhaka",
          quotedPriceBDT: 2000.0,
        };

        const result = service.formatBookingCreated(bookingData);
        expect(result.data.message).toContain(expected);
      });
    });
  });
});































