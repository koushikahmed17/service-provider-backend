import { Test, TestingModule } from "@nestjs/testing";
import { CommissionService } from "@/modules/payment/services/commission.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { NotFoundException } from "@nestjs/common";

describe("CommissionService", () => {
  let service: CommissionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    commissionSetting: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    serviceCategory: {
      findUnique: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionService,
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

    service = module.get<CommissionService>(CommissionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to their default state
    mockPrismaService.commissionSetting.findFirst.mockReset();
    mockPrismaService.commissionSetting.findMany.mockReset();
    mockPrismaService.commissionSetting.findUnique.mockReset();
    mockPrismaService.commissionSetting.create.mockReset();
    mockPrismaService.commissionSetting.update.mockReset();
    mockPrismaService.commissionSetting.delete.mockReset();
    mockPrismaService.serviceCategory.findUnique.mockReset();
    mockPrismaService.booking.findUnique.mockReset();
  });

  describe("createCommissionSetting", () => {
    it("should create a commission setting successfully", async () => {
      const createDto = {
        categoryId: "category-123",
        percent: 20.0,
      };

      const mockCategory = {
        id: "category-123",
        name: "Home Cleaning",
      };

      const mockCommissionSetting = {
        id: "commission-123",
        categoryId: "category-123",
        percent: 20.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: "category-123",
          name: "Home Cleaning",
          slug: "home-cleaning",
        },
      };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(
        mockCategory
      );
      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(null);
      mockPrismaService.commissionSetting.create.mockResolvedValue(
        mockCommissionSetting
      );

      const result = await service.createCommissionSetting(createDto);

      expect(result).toHaveProperty("id", "commission-123");
      expect(result.percent).toBe(20.0);
      expect(result.categoryId).toBe("category-123");
      expect(mockPrismaService.commissionSetting.create).toHaveBeenCalledWith({
        data: {
          categoryId: createDto.categoryId,
          percent: createDto.percent,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it("should create a default commission setting", async () => {
      const createDto = {
        percent: 15.0,
      };

      const mockCommissionSetting = {
        id: "commission-123",
        categoryId: null,
        percent: 15.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(null);
      mockPrismaService.commissionSetting.create.mockResolvedValue(
        mockCommissionSetting
      );

      const result = await service.createCommissionSetting(createDto);

      expect(result).toHaveProperty("id", "commission-123");
      expect(result.percent).toBe(15.0);
      expect(result.categoryId).toBeNull();
    });

    it("should throw NotFoundException for non-existent category", async () => {
      const createDto = {
        categoryId: "non-existent",
        percent: 20.0,
      };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(service.createCommissionSetting(createDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw error for existing commission setting", async () => {
      const createDto = {
        categoryId: "category-123",
        percent: 20.0,
      };

      const mockCategory = {
        id: "category-123",
        name: "Home Cleaning",
      };

      const existingSetting = {
        id: "existing-commission",
        categoryId: "category-123",
        percent: 15.0,
      };

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(
        mockCategory
      );
      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(
        existingSetting
      );

      await expect(service.createCommissionSetting(createDto)).rejects.toThrow(
        "Commission setting already exists for this category"
      );
    });
  });

  describe("getCommissionPercent", () => {
    it("should return category-specific commission", async () => {
      const categorySetting = {
        id: "commission-123",
        categoryId: "category-123",
        percent: 20.0,
      };

      mockPrismaService.commissionSetting.findFirst.mockResolvedValue(
        categorySetting
      );

      const result = await service.getCommissionPercent("category-123");

      expect(result).toBe(20.0);
      expect(
        mockPrismaService.commissionSetting.findFirst
      ).toHaveBeenCalledWith({
        where: { categoryId: "category-123" },
      });
    });

    it("should return default commission when category-specific not found", async () => {
      const defaultSetting = {
        id: "default-commission",
        categoryId: null,
        percent: 15.0,
      };

      mockPrismaService.commissionSetting.findFirst
        .mockResolvedValueOnce(null) // category-specific not found
        .mockResolvedValueOnce(defaultSetting); // default found

      const result = await service.getCommissionPercent("category-123");

      expect(result).toBe(15.0);
    });

    it("should return system default when no settings exist", async () => {
      mockPrismaService.commissionSetting.findFirst
        .mockResolvedValueOnce(null) // category-specific not found
        .mockResolvedValueOnce(null); // default not found

      const result = await service.getCommissionPercent("category-123");

      expect(result).toBe(15.0); // System default
    });
  });

  describe("calculateCommission", () => {
    it("should calculate commission correctly", async () => {
      const amount = 1000.0;
      const commissionPercent = 15.0;

      mockPrismaService.commissionSetting.findFirst.mockResolvedValue({
        id: "commission-123",
        categoryId: "category-123",
        percent: commissionPercent,
      });

      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        id: "category-123",
        name: "Home Cleaning",
      });

      const result = await service.calculateCommission(amount, "category-123");

      expect(result.amount).toBe(1000.0);
      expect(result.commissionPercent).toBe(15.0);
      expect(result.commissionAmount).toBe(150.0);
      expect(result.netAmount).toBe(850.0);
      expect(result.categoryId).toBe("category-123");
      expect(result.categoryName).toBe("Home Cleaning");
    });

    it("should calculate commission for default rate", async () => {
      const amount = 2000.0;

      mockPrismaService.commissionSetting.findFirst
        .mockResolvedValueOnce(null) // category-specific not found
        .mockResolvedValueOnce({
          id: "default-commission",
          categoryId: null,
          percent: 12.0,
        }); // default found

      const result = await service.calculateCommission(amount);

      expect(result.amount).toBe(2000.0);
      expect(result.commissionPercent).toBe(15.0);
      expect(result.commissionAmount).toBe(300.0);
      expect(result.netAmount).toBe(1700.0);
      expect(result.categoryId).toBeUndefined();
      expect(result.categoryName).toBeUndefined();
    });
  });

  describe("calculateCommissionForBooking", () => {
    it("should calculate commission for booking with final amount", async () => {
      const mockBooking = {
        id: "booking-123",
        finalAmountBDT: 2500.0,
        quotedPriceBDT: 2000.0,
        categoryId: "category-123",
        category: {
          name: "Home Cleaning",
        },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.commissionSetting.findFirst
        .mockResolvedValueOnce({
          id: "commission-123",
          categoryId: "category-123",
          percent: 20.0,
        })
        .mockResolvedValueOnce(null); // default not found
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue({
        name: "Home Cleaning",
      });

      const result = await service.calculateCommissionForBooking("booking-123");

      expect(result.amount).toBe(2500.0); // Uses final amount
      expect(result.commissionPercent).toBe(20.0);
      expect(result.commissionAmount).toBe(500.0);
      expect(result.netAmount).toBe(2000.0);
      expect(result.categoryId).toBe("category-123");
      expect(result.categoryName).toBe("Home Cleaning");
    });

    it("should calculate commission for booking with quoted price", async () => {
      const mockBooking = {
        id: "booking-123",
        finalAmountBDT: null,
        quotedPriceBDT: 2000.0,
        categoryId: "category-123",
        category: {
          name: "Home Cleaning",
        },
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.commissionSetting.findFirst.mockResolvedValue({
        id: "commission-123",
        categoryId: "category-123",
        percent: 15.0,
      });

      const result = await service.calculateCommissionForBooking("booking-123");

      expect(result.amount).toBe(2000.0); // Uses quoted price
      expect(result.commissionPercent).toBe(15.0);
      expect(result.commissionAmount).toBe(300.0);
      expect(result.netAmount).toBe(1700.0);
    });

    it("should throw NotFoundException for non-existent booking", async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateCommissionForBooking("non-existent")
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updateCommissionSetting", () => {
    it("should update commission setting successfully", async () => {
      const updateDto = { percent: 25.0 };
      const existingSetting = {
        id: "commission-123",
        categoryId: "category-123",
        percent: 20.0,
      };
      const updatedSetting = {
        ...existingSetting,
        percent: 25.0,
        category: {
          id: "category-123",
          name: "Home Cleaning",
          slug: "home-cleaning",
        },
      };

      mockPrismaService.commissionSetting.findUnique.mockResolvedValue(
        existingSetting
      );
      mockPrismaService.commissionSetting.update.mockResolvedValue(
        updatedSetting
      );

      const result = await service.updateCommissionSetting(
        "commission-123",
        updateDto
      );

      expect(result.percent).toBe(25.0);
      expect(mockPrismaService.commissionSetting.update).toHaveBeenCalledWith({
        where: { id: "commission-123" },
        data: { percent: 25.0 },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    it("should throw NotFoundException for non-existent commission setting", async () => {
      const updateDto = { percent: 25.0 };

      mockPrismaService.commissionSetting.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCommissionSetting("non-existent", updateDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteCommissionSetting", () => {
    it("should delete commission setting successfully", async () => {
      const existingSetting = {
        id: "commission-123",
        categoryId: "category-123",
        percent: 20.0,
      };

      mockPrismaService.commissionSetting.findUnique.mockResolvedValue(
        existingSetting
      );
      mockPrismaService.commissionSetting.delete.mockResolvedValue(
        existingSetting
      );

      await service.deleteCommissionSetting("commission-123");

      expect(mockPrismaService.commissionSetting.delete).toHaveBeenCalledWith({
        where: { id: "commission-123" },
      });
    });

    it("should throw NotFoundException for non-existent commission setting", async () => {
      mockPrismaService.commissionSetting.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteCommissionSetting("non-existent")
      ).rejects.toThrow(NotFoundException);
    });
  });
});
