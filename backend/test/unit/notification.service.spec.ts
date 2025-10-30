import { Test, TestingModule } from "@nestjs/testing";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { PresenceService } from "@/modules/notification/services/presence.service";
import { FormatterService } from "@/modules/notification/services/formatter.service";
import { NotificationsLogRepo } from "@/modules/notification/repos/notifications.log.repo";
import { Server } from "socket.io";

describe("NotificationService", () => {
  let service: NotificationService;
  let presenceService: PresenceService;
  let formatterService: FormatterService;
  let logRepo: NotificationsLogRepo;
  let mockServer: Partial<Server>;

  const mockPresenceService = {
    getUserSockets: jest.fn(),
    getRoleSockets: jest.fn(),
    getOnlineUsers: jest.fn(),
  };

  const mockFormatterService = {
    formatBookingCreated: jest.fn(),
    formatBookingAccepted: jest.fn(),
    formatBookingReminder: jest.fn(),
    formatBookingCompleted: jest.fn(),
    formatReviewCreated: jest.fn(),
    formatNearbyJob: jest.fn(),
    formatGenericNotification: jest.fn(),
  };

  const mockLogRepo = {
    logNotification: jest.fn(),
    getNotificationStats: jest.fn(),
    getNotificationLogs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PresenceService,
          useValue: mockPresenceService,
        },
        {
          provide: FormatterService,
          useValue: mockFormatterService,
        },
        {
          provide: NotificationsLogRepo,
          useValue: mockLogRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    presenceService = module.get<PresenceService>(PresenceService);
    formatterService = module.get<FormatterService>(FormatterService);
    logRepo = module.get<NotificationsLogRepo>(NotificationsLogRepo);

    // Mock server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    service.setServer(mockServer as Server);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("emitToUser", () => {
    it("should emit notification to user when online", async () => {
      const userId = "user-123";
      const event = "test.event";
      const payload = { message: "Test notification" };

      mockPresenceService.getUserSockets.mockReturnValue([
        "socket-1",
        "socket-2",
      ]);
      mockLogRepo.logNotification.mockResolvedValue({});

      await service.emitToUser(userId, event, payload);

      expect(mockPresenceService.getUserSockets).toHaveBeenCalledWith(userId);
      expect(mockServer.to).toHaveBeenCalledWith("socket-1");
      expect(mockServer.to).toHaveBeenCalledWith("socket-2");
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
      expect(mockLogRepo.logNotification).toHaveBeenCalledWith(
        userId,
        event,
        payload,
        true
      );
    });

    it("should log notification as failed when user is offline", async () => {
      const userId = "user-123";
      const event = "test.event";
      const payload = { message: "Test notification" };

      mockPresenceService.getUserSockets.mockReturnValue([]);
      mockLogRepo.logNotification.mockResolvedValue({});

      await service.emitToUser(userId, event, payload);

      expect(mockPresenceService.getUserSockets).toHaveBeenCalledWith(userId);
      expect(mockServer.emit).not.toHaveBeenCalled();
      expect(mockLogRepo.logNotification).toHaveBeenCalledWith(
        userId,
        event,
        payload,
        false,
        "User not online"
      );
    });
  });

  describe("emitToRole", () => {
    it("should emit notification to all users with specific role", async () => {
      const role = "PROFESSIONAL";
      const event = "test.event";
      const payload = { message: "Test notification" };

      mockPresenceService.getRoleSockets.mockReturnValue([
        "socket-1",
        "socket-2",
      ]);
      mockLogRepo.logNotification.mockResolvedValue({});

      await service.emitToRole(role, event, payload);

      expect(mockPresenceService.getRoleSockets).toHaveBeenCalledWith(role);
      expect(mockServer.to).toHaveBeenCalledWith("socket-1");
      expect(mockServer.to).toHaveBeenCalledWith("socket-2");
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });

    it("should not emit when no users with role are online", async () => {
      const role = "PROFESSIONAL";
      const event = "test.event";
      const payload = { message: "Test notification" };

      mockPresenceService.getRoleSockets.mockReturnValue([]);

      await service.emitToRole(role, event, payload);

      expect(mockPresenceService.getRoleSockets).toHaveBeenCalledWith(role);
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe("emitNearby", () => {
    it("should emit nearby job notification to professionals", async () => {
      const lat = 23.8103;
      const lng = 90.4125;
      const radiusKm = 5;
      const event = "nearby-job";
      const payload = { message: "Nearby job available" };

      mockPresenceService.getRoleSockets.mockReturnValue([
        "socket-1",
        "socket-2",
      ]);

      await service.emitNearby(lat, lng, radiusKm, event, payload);

      expect(mockPresenceService.getRoleSockets).toHaveBeenCalledWith(
        "PROFESSIONAL"
      );
      expect(mockServer.to).toHaveBeenCalledWith("socket-1");
      expect(mockServer.to).toHaveBeenCalledWith("socket-2");
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe("notifyBookingCreated", () => {
    it("should format and send booking created notification", async () => {
      const bookingData = {
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "plumbing",
        status: "PENDING",
        scheduledAt: new Date(),
        addressText: "123 Test St",
        quotedPriceBDT: 2000,
      };

      const formattedPayload = {
        id: "booking-123",
        type: "booking",
        title: "New Booking Request",
        message: "You have a new booking request for Plumbing",
      };

      mockFormatterService.formatBookingCreated.mockReturnValue({
        event: "booking.created",
        data: formattedPayload,
        timestamp: new Date(),
        userId: "professional-123",
      });

      mockPresenceService.getUserSockets.mockReturnValue(["socket-1"]);
      mockLogRepo.logNotification.mockResolvedValue({});

      await service.notifyBookingCreated(bookingData);

      expect(mockFormatterService.formatBookingCreated).toHaveBeenCalledWith(
        bookingData
      );
      expect(mockPresenceService.getUserSockets).toHaveBeenCalledWith(
        "professional-123"
      );
      expect(mockLogRepo.logNotification).toHaveBeenCalledWith(
        "professional-123",
        "booking.created",
        formattedPayload,
        true
      );
    });
  });

  describe("notifyReviewCreated", () => {
    it("should format and send review created notification", async () => {
      const reviewData = {
        reviewId: "review-123",
        bookingId: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        rating: 5,
        comment: "Great service!",
        flagged: false,
      };

      const formattedPayload = {
        id: "review-123",
        type: "review",
        title: "New Review Received",
        message: 'You received a 5-star review: "Great service!"',
      };

      mockFormatterService.formatReviewCreated.mockReturnValue({
        event: "review.created",
        data: formattedPayload,
        timestamp: new Date(),
        userId: "professional-123",
      });

      mockPresenceService.getUserSockets.mockReturnValue(["socket-1"]);
      mockLogRepo.logNotification.mockResolvedValue({});

      await service.notifyReviewCreated(reviewData);

      expect(mockFormatterService.formatReviewCreated).toHaveBeenCalledWith(
        reviewData
      );
      expect(mockPresenceService.getUserSockets).toHaveBeenCalledWith(
        "professional-123"
      );
      expect(mockLogRepo.logNotification).toHaveBeenCalledWith(
        "professional-123",
        "review.created",
        formattedPayload,
        true
      );
    });
  });

  describe("broadcast", () => {
    it("should broadcast message to all connected users", async () => {
      const event = "system.announcement";
      const payload = { message: "System maintenance scheduled" };

      await service.broadcast(event, payload);

      expect(mockServer.emit).toHaveBeenCalledWith(event, {
        event,
        data: payload,
        timestamp: expect.any(Date),
      });
    });
  });

  describe("getNotificationStats", () => {
    it("should return notification statistics", async () => {
      const mockStats = {
        total: 100,
        delivered: 95,
        failed: 5,
        byEvent: { "booking.created": 50, "review.created": 30 },
        byDay: [{ date: "2024-01-15", count: 10 }],
      };

      mockLogRepo.getNotificationStats.mockResolvedValue(mockStats);

      const result = await service.getNotificationStats("user-123");

      expect(mockLogRepo.getNotificationStats).toHaveBeenCalledWith("user-123");
      expect(result).toEqual(mockStats);
    });
  });
});































