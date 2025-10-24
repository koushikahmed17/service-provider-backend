import { Test, TestingModule } from "@nestjs/testing";
import { PaymentService } from "@/modules/payment/services/payment.service";
import { CommissionService } from "@/modules/payment/services/commission.service";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { ILocalGateway } from "@/core/payment-gateway.interface";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PaymentStatus, PaymentMethod } from "@/modules/payment/dto";

describe("PaymentService", () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let paymentGateway: ILocalGateway;
  let commissionService: CommissionService;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
  };

  const mockPaymentGateway = {
    createIntent: jest.fn(),
    capturePayment: jest.fn(),
    refundPayment: jest.fn(),
    verifyWebhook: jest.fn(),
    processWebhook: jest.fn(),
  };

  const mockCommissionService = {
    calculateCommission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: "ILocalGateway",
          useValue: mockPaymentGateway,
        },
        {
          provide: CommissionService,
          useValue: mockCommissionService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    paymentGateway = module.get<ILocalGateway>("ILocalGateway");
    commissionService = module.get<CommissionService>(CommissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPaymentIntent", () => {
    const createDto = {
      bookingId: "booking-123",
      method: PaymentMethod.CARD,
      metadata: { customerNote: "Payment for home cleaning" },
    };

    it("should create payment intent successfully", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        professionalId: "professional-123",
        categoryId: "category-123",
        status: "ACCEPTED",
        quotedPriceBDT: 2000.0,
        finalAmountBDT: null,
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

      const mockIntent = {
        id: "intent-123",
        amount: 2000.0,
        currency: "BDT",
        status: "INITIATED",
        gatewayRef: "gateway-ref-123",
        metadata: { test: true },
      };

      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        amountBDT: 2000.0,
        currency: "BDT",
        status: PaymentStatus.INITIATED,
        method: PaymentMethod.CARD,
        gatewayRef: "gateway-ref-123",
        metadata: { test: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPaymentGateway.createIntent.mockResolvedValue(mockIntent);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.createPaymentIntent(
        createDto,
        "customer-123"
      );

      expect(result).toHaveProperty("id", "payment-123");
      expect(result.status).toBe(PaymentStatus.INITIATED);
      expect(result.amountBDT).toBe(2000.0);
      expect(mockPaymentGateway.createIntent).toHaveBeenCalledWith({
        amount: 2000.0,
        currency: "BDT",
        bookingId: "booking-123",
        customerId: "customer-123",
        metadata: expect.any(Object),
      });
    });

    it("should throw NotFoundException for non-existent booking", async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent(createDto, "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for booking not owned by customer", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "other-customer",
        status: "ACCEPTED",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.createPaymentIntent(createDto, "customer-123")
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid booking status", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        status: "CANCELLED",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.createPaymentIntent(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for existing payment", async () => {
      const mockBooking = {
        id: "booking-123",
        customerId: "customer-123",
        status: "ACCEPTED",
      };

      const existingPayment = {
        id: "existing-payment",
        bookingId: "booking-123",
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.payment.findFirst.mockResolvedValue(existingPayment);

      await expect(
        service.createPaymentIntent(createDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("capturePayment", () => {
    const captureDto = {
      amount: 2000.0,
      metadata: { notes: "Service completed" },
    };

    it("should capture payment successfully", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        amountBDT: 2000.0,
        status: PaymentStatus.INITIATED,
        gatewayRef: "gateway-ref-123",
        metadata: {},
        booking: {
          id: "booking-123",
          customerId: "customer-123",
          professionalId: "professional-123",
          status: "ACCEPTED",
          scheduledAt: new Date(),
          quotedPriceBDT: 2000.0,
          finalAmountBDT: null,
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
        },
      };

      const mockCapture = {
        id: "capture-123",
        amount: 2000.0,
        currency: "BDT",
        status: "CAPTURED",
        gatewayRef: "gateway-ref-123",
        metadata: { capturedAt: new Date().toISOString() },
      };

      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.CAPTURED,
        metadata: { ...mockPayment.metadata, ...mockCapture.metadata },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPaymentGateway.capturePayment.mockResolvedValue(mockCapture);
      mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.capturePayment(
        "payment-123",
        captureDto,
        "customer-123"
      );

      expect(result.status).toBe(PaymentStatus.CAPTURED);
      expect(mockPaymentGateway.capturePayment).toHaveBeenCalledWith({
        paymentId: "gateway-ref-123",
        amount: 2000.0,
        metadata: expect.any(Object),
      });
    });

    it("should throw NotFoundException for non-existent payment", async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(
        service.capturePayment("non-existent", captureDto, "customer-123")
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for unauthorized access", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        status: PaymentStatus.INITIATED,
        booking: {
          customerId: "other-customer",
          professionalId: "other-professional",
        },
      };

      const mockUser = {
        id: "customer-123",
        roles: [{ role: { name: "CUSTOMER" } }],
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.capturePayment("payment-123", captureDto, "customer-123")
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for invalid payment status", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        status: PaymentStatus.CAPTURED,
        gatewayRef: "gateway-ref-123",
        booking: {
          customerId: "customer-123",
          professionalId: "professional-123",
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.capturePayment("payment-123", captureDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("refundPayment", () => {
    const refundDto = {
      amount: 1000.0,
      reason: "Customer requested refund",
      metadata: { adminNote: "Partial refund processed" },
    };

    it("should refund payment successfully", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        amountBDT: 2000.0,
        status: PaymentStatus.CAPTURED,
        gatewayRef: "gateway-ref-123",
        metadata: {},
        booking: {
          id: "booking-123",
          customerId: "customer-123",
          professionalId: "professional-123",
          status: "COMPLETED",
          scheduledAt: new Date(),
          quotedPriceBDT: 2000.0,
          finalAmountBDT: 2000.0,
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
        },
      };

      const mockRefund = {
        id: "refund-123",
        amount: 1000.0,
        currency: "BDT",
        status: "REFUNDED",
        gatewayRef: "gateway-ref-123",
        metadata: { refundedAt: new Date().toISOString() },
      };

      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
        metadata: { ...mockPayment.metadata, ...mockRefund.metadata },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);
      mockPaymentGateway.refundPayment.mockResolvedValue(mockRefund);
      mockPrismaService.payment.update.mockResolvedValue(updatedPayment);

      const result = await service.refundPayment(
        "payment-123",
        refundDto,
        "customer-123"
      );

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(mockPaymentGateway.refundPayment).toHaveBeenCalledWith({
        paymentId: "gateway-ref-123",
        amount: 1000.0,
        reason: "Customer requested refund",
        metadata: expect.any(Object),
      });
    });

    it("should throw BadRequestException for invalid payment status", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        amountBDT: 2000.0,
        status: PaymentStatus.INITIATED,
        gatewayRef: "gateway-ref-123",
        booking: {
          customerId: "customer-123",
          professionalId: "professional-123",
        },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment("payment-123", refundDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for refund amount exceeding payment amount", async () => {
      const mockPayment = {
        id: "payment-123",
        bookingId: "booking-123",
        amountBDT: 1000.0,
        status: PaymentStatus.CAPTURED,
        gatewayRef: "gateway-ref-123",
        booking: {
          customerId: "customer-123",
          professionalId: "professional-123",
        },
      };

      const invalidRefundDto = {
        amount: 2000.0, // Exceeds payment amount
        reason: "Customer requested refund",
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment("payment-123", invalidRefundDto, "customer-123")
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("processWebhook", () => {
    it("should process webhook successfully", async () => {
      const payload = {
        eventType: "payment.captured",
        paymentId: "gateway-ref-123",
        status: "CAPTURED",
        amount: 2000.0,
        currency: "BDT",
      };

      const signature = "valid-signature";

      const mockPayment = {
        id: "payment-123",
        gatewayRef: "gateway-ref-123",
        metadata: {},
      };

      const webhookResult = {
        success: true,
        paymentId: "gateway-ref-123",
        status: "CAPTURED",
      };

      mockPaymentGateway.verifyWebhook.mockReturnValue(true);
      mockPaymentGateway.processWebhook.mockResolvedValue(webhookResult);
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue(mockPayment);

      const result = await service.processWebhook(payload, signature);

      expect(result.success).toBe(true);
      expect(mockPaymentGateway.verifyWebhook).toHaveBeenCalledWith(
        payload,
        signature
      );
      expect(mockPaymentGateway.processWebhook).toHaveBeenCalledWith(payload);
    });

    it("should return failure for invalid signature", async () => {
      const payload = { test: "data" };
      const signature = "invalid-signature";

      mockPaymentGateway.verifyWebhook.mockReturnValue(false);

      const result = await service.processWebhook(payload, signature);

      expect(result.success).toBe(false);
      expect(mockPaymentGateway.processWebhook).not.toHaveBeenCalled();
    });

    it("should handle webhook processing errors", async () => {
      const payload = { test: "data" };
      const signature = "valid-signature";

      mockPaymentGateway.verifyWebhook.mockReturnValue(true);
      mockPaymentGateway.processWebhook.mockRejectedValue(
        new Error("Processing failed")
      );

      const result = await service.processWebhook(payload, signature);

      expect(result.success).toBe(false);
    });
  });
});
