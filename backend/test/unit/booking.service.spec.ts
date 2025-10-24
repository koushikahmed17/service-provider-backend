import { Test, TestingModule } from "@nestjs/testing";
import { BookingService } from "@/modules/booking/services/booking.service";
import { BookingStateMachineService } from "@/modules/booking/services/booking-state-machine.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { SearchService } from "@/modules/service-catalog/services/search.service";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import {
  BookingStatus,
  BookingEventType,
  PricingModel,
} from "@/modules/booking/dto";

describe("BookingService", () => {
  let service: BookingService;
  let prismaService: PrismaService;
  let stateMachineService: BookingStateMachineService;

  const mockPrismaService = {
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    bookingEvent: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    serviceCategory: {
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockSearchService = {
    searchProfessionalServices: jest.fn(),
  };

  beforeEach(async () => {
    // Mock Date to return a fixed date
    const mockDate = new Date("2024-01-01T00:00:00.000Z");
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        BookingStateMachineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prismaService = module.get<PrismaService>(PrismaService);
    stateMachineService = module.get<BookingStateMachineService>(
      BookingStateMachineService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("createBooking", () => {
    const createDto = {
      professionalId: "professional-123",
      categoryId: "category-123",
      scheduledAt: "2025-02-01T10:00:00.000Z", // Future date
      addressText: "123 Main Street, Dhaka, Bangladesh",
      lat: 23.8103,
      lng: 90.4125,
      details: "Please bring tools",
      pricingModel: PricingModel.HOURLY,
      quotedPriceBDT: 2000.0,
      commissionPercent: 15.0,
    };

    it("should create a booking successfully", async () => {
      const mockProfessional = {
        id: "professional-123",
        isActive: true,
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      const mockCategory = {
        id: "category-123",
        name: "Home Cleaning",
      };

      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        professionalId: createDto.professionalId,
        categoryId: createDto.categoryId,
        status: BookingStatus.PENDING,
        scheduledAt: new Date(createDto.scheduledAt),
        addressText: createDto.addressText,
        lat: createDto.lat,
        lng: createDto.lng,
        details: createDto.details,
        pricingModel: createDto.pricingModel,
        quotedPriceBDT: createDto.quotedPriceBDT,
        commissionPercent: createDto.commissionPercent,
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
          id: "customer-123",
          fullName: "John Doe",
          email: "john@example.com",
        },
        professional: {
          id: "professional-123",
          fullName: "Jane Smith",
          email: "jane@example.com",
        },
        category: {
          id: "category-123",
          name: "Home Cleaning",
          slug: "home-cleaning",
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfessional);
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(
        mockCategory
      );
      mockPrismaService.booking.create.mockResolvedValue(mockBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      const result = await service.createBooking(createDto, "customer-123");

      expect(result).toHaveProperty("id", "booking-123");
      expect(result.status).toBe(BookingStatus.PENDING);
      expect(mockPrismaService.booking.create).toHaveBeenCalledWith({
        data: {
          customerId: "customer-123",
          professionalId: createDto.professionalId,
          categoryId: createDto.categoryId,
          status: BookingStatus.PENDING,
          scheduledAt: new Date(createDto.scheduledAt),
          addressText: createDto.addressText,
          lat: createDto.lat,
          lng: createDto.lng,
          details: createDto.details,
          pricingModel: createDto.pricingModel,
          quotedPriceBDT: createDto.quotedPriceBDT,
          commissionPercent: createDto.commissionPercent,
        },
        include: expect.any(Object),
      });
      expect(mockPrismaService.bookingEvent.create).toHaveBeenCalledWith({
        data: {
          bookingId: "booking-123",
          type: BookingEventType.CREATED,
          metadata: expect.any(Object),
        },
      });
    });

    it("should throw NotFoundException for non-existent professional", async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking(createDto, "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for inactive professional", async () => {
      const mockProfessional = {
        id: "professional-123",
        isActive: false,
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfessional);

      await expect(
        service.createBooking(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for non-professional user", async () => {
      const mockProfessional = {
        id: "professional-123",
        isActive: true,
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfessional);

      await expect(
        service.createBooking(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for non-existent category", async () => {
      const mockProfessional = {
        id: "professional-123",
        isActive: true,
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfessional);
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking(createDto, "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for past scheduled time", async () => {
      const pastDto = {
        ...createDto,
        scheduledAt: "2020-01-01T10:00:00.000Z",
      };

      const mockProfessional = {
        id: "professional-123",
        isActive: true,
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      const mockCategory = {
        id: "category-123",
        name: "Home Cleaning",
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfessional);
      mockPrismaService.serviceCategory.findUnique.mockResolvedValue(
        mockCategory
      );

      await expect(
        service.createBooking(pastDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getBookingById", () => {
    it("should return booking for authorized user", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        status: BookingStatus.PENDING,
        events: [],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.getBookingById(
        "booking-123",
        "customer-123"
      );

      expect(result).toHaveProperty("id", "booking-123");
      expect(mockPrismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        include: expect.any(Object),
      });
    });

    it("should throw NotFoundException for non-existent booking", async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.getBookingById("non-existent", "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for unauthorized access", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "other-customer",
        professionalId: "other-professional",
        status: BookingStatus.PENDING,
      };

      const mockUser = {
        id: "customer-123",
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.getBookingById("booking-123", "customer-123")
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("acceptBooking", () => {
    it("should accept booking successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.PENDING,
        events: [{ type: BookingEventType.CREATED }],
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        status: BookingStatus.ACCEPTED,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      jest.spyOn(stateMachineService, "canTransitionTo").mockReturnValue({
        canTransition: true,
      });

      const acceptDto = { message: "I'll be there on time" };
      const result = await service.acceptBooking(
        "booking-123",
        "professional-123",
        acceptDto
      );

      expect(result.status).toBe(BookingStatus.ACCEPTED);
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: { status: BookingStatus.ACCEPTED },
        include: expect.any(Object),
      });
    });

    it("should throw ForbiddenException for non-assigned professional", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "other-professional",
        status: BookingStatus.PENDING,
        events: [{ type: BookingEventType.CREATED }],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const acceptDto = { message: "I'll be there on time" };
      await expect(
        service.acceptBooking("booking-123", "professional-123", acceptDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid transition", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.COMPLETED,
        events: [{ type: BookingEventType.CREATED }],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      jest.spyOn(stateMachineService, "canTransitionTo").mockReturnValue({
        canTransition: false,
        reason: "Cannot transition from COMPLETED to ACCEPTED",
      });

      const acceptDto = { message: "I'll be there on time" };
      await expect(
        service.acceptBooking("booking-123", "professional-123", acceptDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("checkOutBooking", () => {
    it("should check out booking successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.IN_PROGRESS,
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        checkOutAt: new Date(),
        actualHours: 2.5,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      const checkOutDto = { actualHours: 2.5, notes: "Work completed" };
      const result = await service.checkOutBooking(
        "booking-123",
        "professional-123",
        checkOutDto
      );

      expect(result).toHaveProperty("checkOutAt");
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: {
          checkOutAt: expect.any(Date),
          actualHours: 2.5,
        },
        include: expect.any(Object),
      });
    });

    it("should throw BadRequestException for non-in-progress booking", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.PENDING,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const checkOutDto = { actualHours: 2.5 };
      await expect(
        service.checkOutBooking("booking-123", "professional-123", checkOutDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("completeBooking", () => {
    it("should complete booking successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.IN_PROGRESS,
        pricingModel: PricingModel.HOURLY,
        quotedPriceBDT: 1000.0,
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        finalAmountBDT: 2500.0,
        actualHours: 2.5,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      const completeDto = { actualHours: 2.5, notes: "All work completed" };
      const result = await service.completeBooking(
        "booking-123",
        "professional-123",
        completeDto
      );

      expect(result.status).toBe(BookingStatus.COMPLETED);
      expect(result.finalAmountBDT).toBe(2500.0);
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: "booking-123" },
        data: {
          status: BookingStatus.COMPLETED,
          actualHours: 2.5,
          finalAmountBDT: 2500.0,
        },
        include: expect.any(Object),
      });
    });

    it("should calculate final amount for hourly pricing", async () => {
      const mockBooking = {
        id: "booking-123",
        professionalId: "professional-123",
        status: BookingStatus.IN_PROGRESS,
        pricingModel: PricingModel.HOURLY,
        quotedPriceBDT: 1000.0,
        actualHours: 2.0,
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        finalAmountBDT: 2000.0,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      const completeDto = { actualHours: 2.0 };
      const result = await service.completeBooking(
        "booking-123",
        "professional-123",
        completeDto
      );

      expect(result.finalAmountBDT).toBe(2000.0);
    });
  });

  describe("cancelBooking", () => {
    it("should cancel booking successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        status: BookingStatus.PENDING,
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelReason: "Customer requested cancellation",
      };

      const mockUser = {
        id: "customer-123",
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      jest.spyOn(stateMachineService, "canBeCancelled").mockReturnValue(true);

      const cancelDto = { reason: "Customer requested cancellation" };
      const result = await service.cancelBooking(
        "booking-123",
        "customer-123",
        cancelDto
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
      expect(result.cancelReason).toBe("Customer requested cancellation");
    });

    it("should throw ForbiddenException for unauthorized cancellation", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "other-customer",
        professionalId: "other-professional",
        status: BookingStatus.PENDING,
      };

      const mockUser = {
        id: "customer-123",
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const cancelDto = { reason: "Customer requested cancellation" };
      await expect(
        service.cancelBooking("booking-123", "customer-123", cancelDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow admin to cancel any booking", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "other-customer",
        professionalId: "other-professional",
        status: BookingStatus.PENDING,
      };

      const mockUser = {
        id: "admin-123",
        roles: [{ role: { name: "ADMIN" } }],
      };

      const mockUpdatedBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelReason: "Admin cancellation",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.bookingEvent.create.mockResolvedValue({});

      jest.spyOn(stateMachineService, "canBeCancelled").mockReturnValue(true);

      const cancelDto = { reason: "Admin cancellation" };
      const result = await service.cancelBooking(
        "booking-123",
        "admin-123",
        cancelDto
      );

      expect(result.status).toBe(BookingStatus.CANCELLED);
    });
  });

  describe("getBookingStats", () => {
    it("should return booking statistics for customer", async () => {
      const mockUser = {
        id: "customer-123",
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.booking.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(2) // pending
        .mockResolvedValueOnce(3) // accepted
        .mockResolvedValueOnce(1) // inProgress
        .mockResolvedValueOnce(3) // completed
        .mockResolvedValueOnce(1); // cancelled

      mockPrismaService.booking.aggregate.mockResolvedValue({
        _sum: { finalAmountBDT: 15000.0 },
      });

      const result = await service.getBookingStats("customer-123");

      expect(result.total).toBe(10);
      expect(result.pending).toBe(2);
      expect(result.accepted).toBe(3);
      expect(result.inProgress).toBe(1);
      expect(result.completed).toBe(3);
      expect(result.cancelled).toBe(1);
      expect(result.totalRevenue).toBe(15000.0);
      expect(result.totalCommission).toBe(2250.0);
    });

    it("should return booking statistics for professional", async () => {
      const mockUser = {
        id: "professional-123",
        roles: [{ role: { name: "PROFESSIONAL" } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.booking.count
        .mockResolvedValueOnce(8) // total
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(2) // accepted
        .mockResolvedValueOnce(1) // inProgress
        .mockResolvedValueOnce(4) // completed
        .mockResolvedValueOnce(0); // cancelled

      mockPrismaService.booking.aggregate.mockResolvedValue({
        _sum: { finalAmountBDT: 12000.0 },
      });

      const result = await service.getBookingStats("professional-123");

      expect(result.total).toBe(8);
      expect(result.completed).toBe(4);
      expect(result.totalRevenue).toBe(12000.0);
      expect(result.totalCommission).toBe(1800.0);
    });
  });
});
