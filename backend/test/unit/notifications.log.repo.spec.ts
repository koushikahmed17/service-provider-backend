import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsLogRepo } from "@/modules/notification/repos/notifications.log.repo";
import { PrismaService } from "@/core/prisma.service";

describe("NotificationsLogRepo", () => {
  let repo: NotificationsLogRepo;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsLogRepo,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repo = module.get<NotificationsLogRepo>(NotificationsLogRepo);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("logNotification", () => {
    it("should create a notification log entry", async () => {
      const mockLog = {
        id: "log-123",
        userId: "user-123",
        event: "test.event",
        payload: JSON.stringify({ message: "Test" }),
        delivered: true,
        deliveredAt: new Date(),
        error: null,
        createdAt: new Date(),
      };

      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);

      const result = await repo.logNotification(
        "user-123",
        "test.event",
        { message: "Test" },
        true
      );

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          event: "test.event",
          payload: JSON.stringify({ message: "Test" }),
          delivered: true,
          deliveredAt: expect.any(Date),
          error: undefined,
        },
      });

      expect(result).toEqual({
        id: "log-123",
        userId: "user-123",
        event: "test.event",
        payload: { message: "Test" },
        delivered: true,
        deliveredAt: mockLog.deliveredAt,
        error: null,
        createdAt: mockLog.createdAt,
      });
    });

    it("should create a failed notification log entry", async () => {
      const mockLog = {
        id: "log-123",
        userId: "user-123",
        event: "test.event",
        payload: JSON.stringify({ message: "Test" }),
        delivered: false,
        deliveredAt: null,
        error: "User not online",
        createdAt: new Date(),
      };

      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);

      const result = await repo.logNotification(
        "user-123",
        "test.event",
        { message: "Test" },
        false,
        "User not online"
      );

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          event: "test.event",
          payload: JSON.stringify({ message: "Test" }),
          delivered: false,
          deliveredAt: null,
          error: "User not online",
        },
      });

      expect(result.delivered).toBe(false);
      expect(result.error).toBe("User not online");
    });
  });

  describe("getNotificationLogs", () => {
    it("should return notification logs with pagination", async () => {
      const mockLogs = [
        {
          id: "log-1",
          userId: "user-123",
          event: "test.event",
          payload: JSON.stringify({ message: "Test 1" }),
          delivered: true,
          deliveredAt: new Date(),
          error: null,
          createdAt: new Date(),
        },
        {
          id: "log-2",
          userId: "user-123",
          event: "test.event",
          payload: JSON.stringify({ message: "Test 2" }),
          delivered: false,
          deliveredAt: null,
          error: "Failed",
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(2);

      const result = await repo.getNotificationLogs({
        userId: "user-123",
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter by event type", async () => {
      const mockLogs = [];
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(0);

      await repo.getNotificationLogs({
        event: "booking.created",
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith({
        where: { event: "booking.created" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should filter by delivery status", async () => {
      const mockLogs = [];
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(0);

      await repo.getNotificationLogs({
        delivered: true,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith({
        where: { delivered: true },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const mockLogs = [];

      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(0);

      await repo.getNotificationLogs({
        startDate,
        endDate,
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 10,
      });
    });
  });

  describe("getNotificationStats", () => {
    it("should return notification statistics", async () => {
      const mockStats = {
        total: 100,
        delivered: 95,
        failed: 5,
        byEvent: [
          { event: "booking.created", _count: { event: 50 } },
          { event: "review.created", _count: { event: 30 } },
        ],
        byDay: [
          { createdAt: new Date("2024-01-15"), _count: { createdAt: 10 } },
          { createdAt: new Date("2024-01-16"), _count: { createdAt: 15 } },
        ],
      };

      mockPrismaService.notificationLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95) // delivered
        .mockResolvedValueOnce(5); // failed

      mockPrismaService.notificationLog.groupBy
        .mockResolvedValueOnce(mockStats.byEvent) // byEvent
        .mockResolvedValueOnce(mockStats.byDay); // byDay

      const result = await repo.getNotificationStats("user-123");

      expect(result.total).toBe(100);
      expect(result.delivered).toBe(95);
      expect(result.failed).toBe(5);
      expect(result.byEvent).toEqual({
        "booking.created": 50,
        "review.created": 30,
      });
      expect(result.byDay).toHaveLength(2);
    });

    it("should return statistics for all users when no userId provided", async () => {
      mockPrismaService.notificationLog.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(180) // delivered
        .mockResolvedValueOnce(20); // failed

      mockPrismaService.notificationLog.groupBy
        .mockResolvedValueOnce([]) // byEvent
        .mockResolvedValueOnce([]); // byDay

      await repo.getNotificationStats();

      expect(mockPrismaService.notificationLog.count).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.notificationLog.count).toHaveBeenNthCalledWith(
        1,
        { where: {} }
      );
    });
  });

  describe("markAsDelivered", () => {
    it("should mark notification as delivered", async () => {
      mockPrismaService.notificationLog.update.mockResolvedValue({});

      await repo.markAsDelivered("log-123");

      expect(mockPrismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: "log-123" },
        data: {
          delivered: true,
          deliveredAt: expect.any(Date),
        },
      });
    });
  });

  describe("markAsFailed", () => {
    it("should mark notification as failed", async () => {
      mockPrismaService.notificationLog.update.mockResolvedValue({});

      await repo.markAsFailed("log-123", "Connection timeout");

      expect(mockPrismaService.notificationLog.update).toHaveBeenCalledWith({
        where: { id: "log-123" },
        data: {
          delivered: false,
          error: "Connection timeout",
        },
      });
    });
  });

  describe("cleanupOldLogs", () => {
    it("should delete old notification logs", async () => {
      mockPrismaService.notificationLog.deleteMany.mockResolvedValue({
        count: 50,
      });

      const result = await repo.cleanupOldLogs(30);

      expect(mockPrismaService.notificationLog.deleteMany).toHaveBeenCalledWith(
        {
          where: {
            createdAt: {
              lt: expect.any(Date),
            },
          },
        }
      );

      expect(result).toBe(50);
    });

    it("should use default days when not specified", async () => {
      mockPrismaService.notificationLog.deleteMany.mockResolvedValue({
        count: 25,
      });

      await repo.cleanupOldLogs();

      expect(mockPrismaService.notificationLog.deleteMany).toHaveBeenCalledWith(
        {
          where: {
            createdAt: {
              lt: expect.any(Date),
            },
          },
        }
      );
    });
  });
});
