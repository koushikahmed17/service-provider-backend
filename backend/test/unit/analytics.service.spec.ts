import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { AnalyticsService } from "../../src/modules/analytics/services/analytics.service";
import { PrismaService } from "../../src/core/prisma.service";
import { LoggerService } from "../../src/core/logger.service";
import {
  AnalyticsPeriod,
  ReportScope,
  ReportFormat,
} from "../../src/modules/analytics/dto/analytics.dto";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;

  const mockPrismaService = {
    booking: {
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    serviceCategory: {
      findMany: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockResponse = {
    setHeader: jest.fn(),
    send: jest.fn(),
    pipe: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    emit: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
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

    service = module.get<AnalyticsService>(AnalyticsService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    // Don't clear mocks here as it interferes with test execution
  });

  describe("getProfessionalAnalytics", () => {
    it("should return professional analytics", async () => {
      const professionalId = "professional-1";
      const query = { period: AnalyticsPeriod.MONTH, periods: 6 };

      const mockEarnings = { _sum: { finalAmountBDT: 50000 } };
      const mockBookings = [{ rating: 5, createdAt: new Date() }];
      const mockBookingCount = 25;
      const mockTopCategories = [
        {
          categoryId: "cat-1",
          _count: { id: 10 },
          _sum: { finalAmountBDT: 20000 },
        },
      ];
      const mockMonthlyData = [{ createdAt: new Date(), finalAmountBDT: 1000 }];

      mockPrismaService.booking.aggregate
        .mockResolvedValueOnce(mockEarnings)
        .mockResolvedValueOnce({ _count: { id: mockBookingCount } });
      mockPrismaService.booking.count.mockResolvedValue(mockBookingCount);
      mockPrismaService.review.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.booking.groupBy
        .mockResolvedValueOnce(mockTopCategories)
        .mockResolvedValueOnce([]);
      mockPrismaService.booking.findMany.mockResolvedValue(mockMonthlyData);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([
        { id: "cat-1", name: "Cleaning" },
      ]);

      const result = await service.getProfessionalAnalytics(
        professionalId,
        query
      );

      expect(result).toHaveProperty("earnings");
      expect(result).toHaveProperty("ratings");
      expect(result).toHaveProperty("bookings");
      expect(result).toHaveProperty("topCategories");
      expect(result).toHaveProperty("monthlyTrend");
      expect(result).toHaveProperty("period");
      expect(result.earnings.total).toBe(50000);
      expect(result.earnings.completedBookings).toBe(mockBookingCount);
    });

    it("should filter by category when provided", async () => {
      const professionalId = "professional-1";
      const query = { categoryId: "cat-1" };

      mockPrismaService.booking.aggregate.mockResolvedValue({
        _sum: { finalAmountBDT: 10000 },
      });
      mockPrismaService.booking.count.mockResolvedValue(5);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.booking.groupBy.mockResolvedValue([]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await service.getProfessionalAnalytics(professionalId, query);

      // Verify that category filter is applied
      expect(mockPrismaService.booking.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: "cat-1",
          }),
        })
      );
    });
  });

  describe("getCustomerAnalytics", () => {
    it("should return customer analytics", async () => {
      const customerId = "customer-1";
      const query = { period: AnalyticsPeriod.MONTH };

      const mockSpending = { _sum: { finalAmountBDT: 15000 } };
      const mockBookings = [{ rating: 4, createdAt: new Date() }];
      const mockBookingCount = 10;
      const mockTopCategories = [
        {
          categoryId: "cat-1",
          _count: { id: 5 },
          _sum: { finalAmountBDT: 8000 },
        },
      ];
      const mockMonthlyData = [{ createdAt: new Date(), finalAmountBDT: 500 }];

      mockPrismaService.booking.aggregate
        .mockResolvedValueOnce(mockSpending)
        .mockResolvedValueOnce({ _count: { id: mockBookingCount } });
      mockPrismaService.booking.count.mockResolvedValue(mockBookingCount);
      mockPrismaService.booking.groupBy
        .mockResolvedValueOnce(mockTopCategories)
        .mockResolvedValueOnce([]);
      mockPrismaService.booking.findMany.mockResolvedValue(mockMonthlyData);
      mockPrismaService.review.findMany.mockResolvedValue(mockBookings);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([
        { id: "cat-1", name: "Cleaning" },
      ]);

      const result = await service.getCustomerAnalytics(customerId, query);

      expect(result).toHaveProperty("spending");
      expect(result).toHaveProperty("bookings");
      expect(result).toHaveProperty("topCategories");
      expect(result).toHaveProperty("monthlyTrend");
      expect(result).toHaveProperty("averageRating");
      expect(result).toHaveProperty("period");
      expect(result.spending.total).toBe(15000);
      expect(result.averageRating.average).toBe(4);
    });
  });

  describe("getAdminAnalytics", () => {
    it("should return admin analytics", async () => {
      const query = { period: AnalyticsPeriod.MONTH };

      const mockMRR = { _sum: { finalAmountBDT: 100000 } };
      const mockServiceDistribution = [
        {
          categoryId: "cat-1",
          _count: { id: 50 },
          _sum: { finalAmountBDT: 40000 },
        },
      ];
      const mockGeoData = [
        { lat: 23.8103, lng: 90.4125, finalAmountBDT: 1000 },
      ];
      const mockUsers = [
        { createdAt: new Date(), roles: [{ role: { name: "CUSTOMER" } }] },
      ];
      const mockBookings = [
        { createdAt: new Date(), status: "COMPLETED", finalAmountBDT: 500 },
      ];
      const mockRevenue = { _sum: { finalAmountBDT: 75000 } };

      // Mock all aggregate calls in order
      mockPrismaService.booking.aggregate
        .mockResolvedValueOnce(mockMRR) // getMRRData
        .mockResolvedValueOnce({ _sum: { finalAmountBDT: 100000 } }) // getRevenueData - total
        .mockResolvedValueOnce({ _sum: { finalAmountBDT: 75000 } }); // getRevenueData - completed

      mockPrismaService.booking.groupBy
        .mockResolvedValueOnce(mockServiceDistribution)
        .mockResolvedValueOnce([]);
      mockPrismaService.booking.findMany
        .mockResolvedValueOnce(mockGeoData)
        .mockResolvedValueOnce(mockBookings);
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([
        { id: "cat-1", name: "Cleaning" },
      ]);

      const result = await service.getAdminAnalytics(query);

      expect(result).toHaveProperty("mrr");
      expect(result).toHaveProperty("serviceDistribution");
      expect(result).toHaveProperty("geoHeat");
      expect(result).toHaveProperty("userGrowth");
      expect(result).toHaveProperty("bookingTrends");
      expect(result).toHaveProperty("revenue");
      expect(result).toHaveProperty("period");
    });

    it("should filter by region when provided", async () => {
      const query = { region: "Dhaka" };

      mockPrismaService.booking.aggregate.mockResolvedValue({
        _sum: { finalAmountBDT: 0 },
      });
      mockPrismaService.booking.groupBy.mockResolvedValue([]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockPrismaService.serviceCategory.findMany.mockResolvedValue([]);

      await service.getAdminAnalytics(query);

      // Verify that region filter is applied
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            addressText: expect.objectContaining({
              contains: "Dhaka",
            }),
          }),
        })
      );
    });
  });

  describe("exportReport", () => {
    it("should export CSV report for professional", async () => {
      const scope = ReportScope.PROFESSIONAL;
      const format = ReportFormat.CSV;
      const query = { scope, format, period: AnalyticsPeriod.MONTH };

      // Mock the analytics data
      const mockAnalyticsData = {
        earnings: {
          total: 10000,
          completedBookings: 5,
          averagePerBooking: 2000,
          currency: "BDT",
        },
        ratings: { average: 4.5, total: 10, trend: [] },
        bookings: { total: 5, byStatus: {} },
        topCategories: [],
        monthlyTrend: [],
        period: {
          start: new Date(),
          end: new Date(),
          type: AnalyticsPeriod.MONTH,
        },
      };

      jest
        .spyOn(service, "getProfessionalAnalytics")
        .mockResolvedValue(mockAnalyticsData);

      await service.exportReport(scope, format, query, mockResponse as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/csv"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining('attachment; filename="professional-analytics-')
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should export PDF report for admin", async () => {
      const scope = ReportScope.ADMIN;
      const format = ReportFormat.PDF;
      const query = { scope, format };

      const mockAnalyticsData = {
        mrr: { current: 50000, currency: "BDT", period: "monthly" },
        serviceDistribution: [],
        geoHeat: [],
        userGrowth: [],
        bookingTrends: [],
        revenue: { total: 100000, completed: 80000, currency: "BDT" },
        period: {
          start: new Date(),
          end: new Date(),
          type: AnalyticsPeriod.MONTH,
        },
      };

      jest
        .spyOn(service, "getAdminAnalytics")
        .mockResolvedValue(mockAnalyticsData);

      await service.exportReport(scope, format, query, mockResponse as any);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining('attachment; filename="admin-analytics-')
      );
    });

    it("should throw BadRequestException for invalid scope", async () => {
      const scope = "invalid" as ReportScope;
      const format = ReportFormat.CSV;
      const query = { scope, format };

      await expect(
        service.exportReport(scope, format, query, mockResponse as any)
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid format", async () => {
      const scope = ReportScope.PROFESSIONAL;
      const format = "invalid" as ReportFormat;
      const query = { scope, format };

      await expect(
        service.exportReport(scope, format, query, mockResponse as any)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("calculateDateRange", () => {
    it("should calculate correct date range for MONTH period", () => {
      const result = (service as any).calculateDateRange(
        AnalyticsPeriod.MONTH,
        undefined,
        undefined,
        6
      );

      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.end.getTime()).toBeGreaterThan(result.start.getTime());
    });

    it("should use provided start and end dates", () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const result = (service as any).calculateDateRange(
        undefined,
        startDate,
        endDate
      );

      expect(result.start.toISOString().substring(0, 10)).toBe(startDate);
      expect(result.end.toISOString().substring(0, 10)).toBe(endDate);
    });

    it("should default to last 12 months when no parameters provided", () => {
      const result = (service as any).calculateDateRange(
        undefined,
        undefined,
        undefined,
        12
      );

      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);

      // Check that it's approximately 12 months ago
      const monthsDiff =
        (result.end.getFullYear() - result.start.getFullYear()) * 12 +
        (result.end.getMonth() - result.start.getMonth());
      expect(monthsDiff).toBeCloseTo(12, 0);
    });
  });

  describe("convertToCSV", () => {
    it("should convert data to CSV format", () => {
      const data = {
        earnings: { total: 10000, currency: "BDT" },
        ratings: { average: 4.5, total: 10 },
        period: { start: new Date("2024-01-01"), end: new Date("2024-12-31") },
      };

      const csv = (service as any).convertToCSV(data);

      expect(csv).toContain("earnings");
      expect(csv).toContain("ratings");
      expect(csv).toContain("period");
      expect(csv).toContain("10000");
      expect(csv).toContain("4.5");
    });
  });

  describe("getEarningsData", () => {
    it("should calculate earnings correctly", async () => {
      const professionalId = "professional-1";
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      };

      const mockEarnings = { _sum: { finalAmountBDT: 25000 } };
      const mockBookingCount = 15;

      mockPrismaService.booking.aggregate
        .mockResolvedValueOnce(mockEarnings)
        .mockResolvedValueOnce({ _sum: { commissionPercent: 3750 } });
      mockPrismaService.booking.count.mockResolvedValue(mockBookingCount);

      const result = await (service as any).getEarningsData(
        professionalId,
        dateRange
      );

      expect(result.total).toBe(25000);
      expect(result.completedBookings).toBe(15);
      expect(result.averagePerBooking).toBeCloseTo(1666.67, 2);
      expect(result.currency).toBe("BDT");
    });
  });

  describe("getRatingsData", () => {
    it("should calculate ratings correctly", async () => {
      const professionalId = "professional-1";
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      };

      const mockRatings = [
        { rating: 5, createdAt: new Date("2024-01-15") },
        { rating: 4, createdAt: new Date("2024-02-15") },
        { rating: 5, createdAt: new Date("2024-03-15") },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockRatings);

      const result = await (service as any).getRatingsData(
        professionalId,
        dateRange
      );

      expect(result.average).toBe(4.67); // (5+4+5)/3 = 4.67
      expect(result.total).toBe(3);
      expect(result.trend).toHaveLength(3);
    });

    it("should handle empty ratings", async () => {
      const professionalId = "professional-1";
      const dateRange = {
        start: new Date("2024-01-01"),
        end: new Date("2024-12-31"),
      };

      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await (service as any).getRatingsData(
        professionalId,
        dateRange
      );

      expect(result.average).toBe(0);
      expect(result.total).toBe(0);
      expect(result.trend).toEqual([]);
    });
  });
});
