import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { AdminService } from "../../src/modules/admin/services/admin.service";
import { PrismaService } from "../../src/core/prisma.service";
import { LoggerService } from "../../src/core/logger.service";

describe("AdminService", () => {
  let service: AdminService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    professionalProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dispute: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    commissionSetting: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    reviewModerationLog: {
      create: jest.fn(),
    },
    booking: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    serviceCategory: {
      findMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("approveProfessional", () => {
    it("should approve a professional successfully", async () => {
      const professionalId = "professional-1";
      const mockProfessional = {
        userId: professionalId,
        isVerified: false,
        user: {
          fullName: "John Doe",
          email: "john@example.com",
        },
      };

      mockPrismaService.professionalProfile.findUnique.mockResolvedValue(
        mockProfessional
      );
      mockPrismaService.professionalProfile.update.mockResolvedValue({
        ...mockProfessional,
        isVerified: true,
      });

      const result = await service.approveProfessional(professionalId);

      expect(
        mockPrismaService.professionalProfile.findUnique
      ).toHaveBeenCalledWith({
        where: { userId: professionalId },
        include: { user: true },
      });
      expect(mockPrismaService.professionalProfile.update).toHaveBeenCalledWith(
        {
          where: { userId: professionalId },
          data: { isVerified: true },
        }
      );
      expect(result).toEqual({
        id: professionalId,
        fullName: "John Doe",
        email: "john@example.com",
        isVerified: true,
        updatedAt: expect.any(Date),
      });
    });

    it("should throw NotFoundException when professional not found", async () => {
      const professionalId = "non-existent";
      mockPrismaService.professionalProfile.findUnique.mockResolvedValue(null);

      await expect(service.approveProfessional(professionalId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("rejectProfessional", () => {
    it("should reject a professional successfully", async () => {
      const professionalId = "professional-1";
      const mockProfessional = {
        userId: professionalId,
        isVerified: true,
        user: {
          fullName: "John Doe",
          email: "john@example.com",
        },
      };

      mockPrismaService.professionalProfile.findUnique.mockResolvedValue(
        mockProfessional
      );
      mockPrismaService.professionalProfile.update.mockResolvedValue({
        ...mockProfessional,
        isVerified: false,
      });

      const result = await service.rejectProfessional(professionalId);

      expect(mockPrismaService.professionalProfile.update).toHaveBeenCalledWith(
        {
          where: { userId: professionalId },
          data: { isVerified: false },
        }
      );
      expect(result.isVerified).toBe(false);
    });
  });

  describe("banUser", () => {
    it("should ban a user successfully", async () => {
      const userId = "user-1";
      const mockUser = {
        id: userId,
        fullName: "John Doe",
        email: "john@example.com",
        isActive: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await service.banUser(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it("should throw NotFoundException when user not found", async () => {
      const userId = "non-existent";
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.banUser(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("unbanUser", () => {
    it("should unban a user successfully", async () => {
      const userId = "user-1";
      const mockUser = {
        id: userId,
        fullName: "John Doe",
        email: "john@example.com",
        isActive: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        isActive: true,
      });

      const result = await service.unbanUser(userId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });
  });

  describe("getDisputes", () => {
    it("should return disputes with pagination", async () => {
      const mockDisputes = [
        {
          id: "dispute-1",
          status: "PENDING",
          type: "PAYMENT",
          details: "Payment issue",
          booking: {
            customer: { id: "user-1", fullName: "John Doe" },
            professional: { id: "user-2", fullName: "Jane Smith" },
          },
        },
      ];

      mockPrismaService.dispute.findMany.mockResolvedValue(mockDisputes);
      mockPrismaService.dispute.count.mockResolvedValue(1);

      const result = await service.getDisputes({ page: "1", limit: "10" });

      expect(result.disputes).toEqual(mockDisputes);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("should filter disputes by status and type", async () => {
      const query = { status: "PENDING", type: "PAYMENT" };
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.dispute.count.mockResolvedValue(0);

      await service.getDisputes(query);

      expect(mockPrismaService.dispute.findMany).toHaveBeenCalledWith({
        where: { status: "PENDING", type: "PAYMENT" },
        skip: 0,
        take: 10,
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("resolveDispute", () => {
    it("should resolve a dispute successfully", async () => {
      const disputeId = "dispute-1";
      const resolveDto = { resolution: "Resolved in favor of customer" };
      const mockDispute = {
        id: disputeId,
        status: "PENDING",
        resolution: null,
      };

      mockPrismaService.dispute.findUnique.mockResolvedValue(mockDispute);
      mockPrismaService.dispute.update.mockResolvedValue({
        ...mockDispute,
        status: "RESOLVED",
        resolution: resolveDto.resolution,
        resolvedAt: expect.any(Date),
      });

      const result = await service.resolveDispute(disputeId, resolveDto);

      expect(mockPrismaService.dispute.update).toHaveBeenCalledWith({
        where: { id: disputeId },
        data: {
          status: "RESOLVED",
          resolution: resolveDto.resolution,
          resolvedAt: expect.any(Date),
        },
      });
      expect(result.status).toBe("RESOLVED");
    });

    it("should throw NotFoundException when dispute not found", async () => {
      const disputeId = "non-existent";
      const resolveDto = { resolution: "Test resolution" };
      mockPrismaService.dispute.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveDispute(disputeId, resolveDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getCommissionSettings", () => {
    it("should return commission settings with pagination", async () => {
      const mockSettings = [
        {
          id: "setting-1",
          percent: 15.5,
          category: { id: "cat-1", name: "Cleaning" },
        },
      ];

      mockPrismaService.commissionSetting.findMany.mockResolvedValue(
        mockSettings
      );
      mockPrismaService.commissionSetting.count.mockResolvedValue(1);

      const result = await service.getCommissionSettings({
        page: "1",
        limit: "10",
      });

      expect(result.settings).toEqual(mockSettings);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("updateCommissionSettings", () => {
    it("should update existing global commission setting", async () => {
      const updateDto = { percent: 20 };
      const mockSetting = { id: "setting-1", categoryId: null, percent: 15 };

      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(
        mockSetting
      );
      mockPrismaService.commissionSetting.update.mockResolvedValue({
        ...mockSetting,
        percent: 20,
      });

      const result = await service.updateCommissionSettings(updateDto);

      expect(mockPrismaService.commissionSetting.update).toHaveBeenCalledWith({
        where: { id: "setting-1" },
        data: { percent: 20 },
      });
      expect(result.percent).toBe(20);
    });

    it("should create new global commission setting if none exists", async () => {
      const updateDto = { percent: 20 };
      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(null);
      mockPrismaService.commissionSetting.create.mockResolvedValue({
        id: "new-setting",
        categoryId: null,
        percent: 20,
      });

      const result = await service.updateCommissionSettings(updateDto);

      expect(mockPrismaService.commissionSetting.create).toHaveBeenCalledWith({
        data: {
          categoryId: null,
          percent: 20,
        },
      });
      expect(result.percent).toBe(20);
    });
  });

  describe("getFlaggedReviews", () => {
    it("should return flagged reviews with pagination", async () => {
      const mockReviews = [
        {
          id: "review-1",
          flagged: true,
          rating: 1,
          comment: "Bad service",
          customer: { id: "user-1", fullName: "John Doe" },
          professional: { id: "user-2", fullName: "Jane Smith" },
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);
      mockPrismaService.review.count.mockResolvedValue(1);

      const result = await service.getFlaggedReviews({
        page: "1",
        limit: "10",
      });

      expect(result.reviews).toEqual(mockReviews);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("moderateReview", () => {
    it("should approve a review successfully", async () => {
      const reviewId = "review-1";
      const moderateDto = {
        action: "APPROVED",
        reason: "Review is appropriate",
      };
      const mockReview = {
        id: reviewId,
        flagged: true,
      };

      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        flagged: false,
      });
      mockPrismaService.reviewModerationLog.create.mockResolvedValue({});

      const result = await service.moderateReview(reviewId, moderateDto);

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: reviewId },
        data: { flagged: false },
      });
      expect(mockPrismaService.reviewModerationLog.create).toHaveBeenCalledWith(
        {
          data: {
            reviewId,
            adminId: "admin-id",
            action: "APPROVED",
            reason: "Review is appropriate",
          },
        }
      );
      expect(result.action).toBe("APPROVED");
    });

    it("should throw NotFoundException when review not found", async () => {
      const reviewId = "non-existent";
      const moderateDto = { action: "APPROVED" as const };
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateReview(reviewId, moderateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAnalyticsSummary", () => {
    it("should return analytics summary", async () => {
      const mockAnalytics = {
        totalRevenue: { _sum: { finalAmountBDT: 10000 } },
        totalBookings: 50,
        activeUsers: 25,
        topServices: [{ categoryId: "cat-1", _count: { id: 10 } }],
        recentBookings: 5,
      };

      mockPrismaService.booking.aggregate.mockResolvedValue(
        mockAnalytics.totalRevenue
      );
      mockPrismaService.booking.count
        .mockResolvedValueOnce(mockAnalytics.totalBookings)
        .mockResolvedValueOnce(mockAnalytics.recentBookings);
      mockPrismaService.user.count.mockResolvedValue(mockAnalytics.activeUsers);
      mockPrismaService.booking.groupBy.mockResolvedValue(
        mockAnalytics.topServices
      );
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([
        { id: "cat-1", name: "Cleaning" },
      ]);

      const result = await service.getAnalyticsSummary({});

      expect(result.revenue.total).toBe(10000);
      expect(result.bookings.total).toBe(50);
      expect(result.users.active).toBe(25);
      expect(result.topServices[0].categoryName).toBe("Cleaning");
    });

    it("should filter analytics by date range", async () => {
      const query = {
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
      };

      mockPrismaService.booking.aggregate.mockResolvedValue({
        _sum: { finalAmountBDT: 5000 },
      });
      mockPrismaService.booking.count.mockResolvedValue(25);
      mockPrismaService.user.count.mockResolvedValue(15);
      mockPrismaService.booking.groupBy.mockResolvedValue([]);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      const result = await service.getAnalyticsSummary(query);

      expect(result.period.startDate).toBe(query.startDate);
      expect(result.period.endDate).toBe(query.endDate);
    });
  });
});




























