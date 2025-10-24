import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { PaymentModule } from "@/modules/payment/payment.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { BookingModule } from "@/modules/booking/booking.module";
import { ServiceCatalogModule } from "@/modules/service-catalog/service-catalog.module";
import { PaymentGatewayStub } from "@/core/payment-gateway.stub";
import * as pactum from "pactum";
import { PaymentStatus, PaymentMethod } from "@/modules/payment/dto";

describe("Payment (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PaymentModule, AuthModule, BookingModule, ServiceCatalogModule],
    })
      .overrideProvider(LoggerService)
      .useValue({
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    pactum.request.setBaseUrl("http://localhost:3000");
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.payment.deleteMany();
    await prismaService.payout.deleteMany();
    await prismaService.commissionSetting.deleteMany();
    await prismaService.bookingEvent.deleteMany();
    await prismaService.booking.deleteMany();
    await prismaService.professionalService.deleteMany();
    await prismaService.professionalProfile.deleteMany();
    await prismaService.userRole.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.role.deleteMany();
    await prismaService.permission.deleteMany();
    await prismaService.serviceCategory.deleteMany();
  });

  describe("Payment Intent", () => {
    let customerToken: string;
    let professionalToken: string;
    let bookingId: string;
    let categoryId: string;

    beforeEach(async () => {
      // Create test data
      const customer = await prismaService.user.create({
        data: {
          email: "customer@test.com",
          phone: "+1234567890",
          fullName: "Test Customer",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const professional = await prismaService.user.create({
        data: {
          email: "professional@test.com",
          phone: "+1234567891",
          fullName: "Test Professional",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const category = await prismaService.serviceCategory.create({
        data: {
          name: "Home Cleaning",
          slug: "home-cleaning",
          description: "Professional home cleaning services",
          isActive: true,
        },
      });

      const professionalProfile =
        await prismaService.professionalProfile.create({
          data: {
            userId: professional.id,
            skills: ["cleaning", "organization"],
            categories: [category.id],
            hourlyRateBDT: 500.0,
            isActive: true,
          },
        });

      const professionalService =
        await prismaService.professionalService.create({
          data: {
            professionalId: professional.id,
            categoryId: category.id,
            rateType: "HOURLY",
            hourlyRateBDT: 500.0,
            isActive: true,
          },
        });

      const booking = await prismaService.booking.create({
        data: {
          customerId: customer.id,
          professionalId: professional.id,
          categoryId: category.id,
          status: "ACCEPTED",
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          addressText: "123 Test Street",
          lat: 23.8103,
          lng: 90.4125,
          details: "Deep cleaning required",
          pricingModel: "HOURLY",
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });

      // Get auth tokens (simplified for e2e)
      customerToken = "mock-customer-token";
      professionalToken = "mock-professional-token";
      bookingId = booking.id;
      categoryId = category.id;
    });

    it("should create payment intent", () => {
      return pactum
        .spec()
        .post("/payments/intent")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          bookingId,
          method: PaymentMethod.CARD,
          metadata: {
            customerNote: "Payment for home cleaning service",
          },
        })
        .expectStatus(201)
        .expectJsonLike({
          bookingId,
          amountBDT: 2000.0,
          currency: "BDT",
          status: PaymentStatus.INITIATED,
          method: PaymentMethod.CARD,
        });
    });

    it("should fail to create payment intent for non-existent booking", () => {
      return pactum
        .spec()
        .post("/payments/intent")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          bookingId: "non-existent",
          method: PaymentMethod.CARD,
        })
        .expectStatus(404);
    });

    it("should fail to create payment intent for unauthorized user", () => {
      return pactum
        .spec()
        .post("/payments/intent")
        .withHeaders({
          Authorization: `Bearer ${professionalToken}`,
        })
        .withJson({
          bookingId,
          method: PaymentMethod.CARD,
        })
        .expectStatus(403);
    });
  });

  describe("Payment Capture", () => {
    let customerToken: string;
    let paymentId: string;

    beforeEach(async () => {
      // Create test data with existing payment
      const customer = await prismaService.user.create({
        data: {
          email: "customer@test.com",
          phone: "+1234567890",
          fullName: "Test Customer",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const professional = await prismaService.user.create({
        data: {
          email: "professional@test.com",
          phone: "+1234567891",
          fullName: "Test Professional",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const category = await prismaService.serviceCategory.create({
        data: {
          name: "Home Cleaning",
          slug: "home-cleaning",
          description: "Professional home cleaning services",
          isActive: true,
        },
      });

      const booking = await prismaService.booking.create({
        data: {
          customerId: customer.id,
          professionalId: professional.id,
          categoryId: category.id,
          status: "ACCEPTED",
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          addressText: "123 Test Street",
          lat: 23.8103,
          lng: 90.4125,
          details: "Deep cleaning required",
          pricingModel: "HOURLY",
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });

      const payment = await prismaService.payment.create({
        data: {
          bookingId: booking.id,
          amountBDT: 2000.0,
          currency: "BDT",
          status: PaymentStatus.INITIATED,
          method: PaymentMethod.CARD,
          gatewayRef: "mock-gateway-ref",
        },
      });

      customerToken = "mock-customer-token";
      paymentId = payment.id;
    });

    it("should capture payment", () => {
      return pactum
        .spec()
        .post(`/payments/${paymentId}/capture`)
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          amount: 2000.0,
          metadata: {
            notes: "Service completed successfully",
          },
        })
        .expectStatus(200)
        .expectJsonLike({
          id: paymentId,
          status: PaymentStatus.CAPTURED,
          amountBDT: 2000.0,
        });
    });

    it("should fail to capture non-existent payment", () => {
      return pactum
        .spec()
        .post("/payments/non-existent/capture")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          amount: 2000.0,
        })
        .expectStatus(404);
    });
  });

  describe("Payment Refund", () => {
    let customerToken: string;
    let paymentId: string;

    beforeEach(async () => {
      // Create test data with captured payment
      const customer = await prismaService.user.create({
        data: {
          email: "customer@test.com",
          phone: "+1234567890",
          fullName: "Test Customer",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const professional = await prismaService.user.create({
        data: {
          email: "professional@test.com",
          phone: "+1234567891",
          fullName: "Test Professional",
          password: "hashedpassword",
          isEmailVerified: true,
          isPhoneVerified: true,
        },
      });

      const category = await prismaService.serviceCategory.create({
        data: {
          name: "Home Cleaning",
          slug: "home-cleaning",
          description: "Professional home cleaning services",
          isActive: true,
        },
      });

      const booking = await prismaService.booking.create({
        data: {
          customerId: customer.id,
          professionalId: professional.id,
          categoryId: category.id,
          status: "COMPLETED",
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          addressText: "123 Test Street",
          lat: 23.8103,
          lng: 90.4125,
          details: "Deep cleaning required",
          pricingModel: "HOURLY",
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
          finalAmountBDT: 2000.0,
        },
      });

      const payment = await prismaService.payment.create({
        data: {
          bookingId: booking.id,
          amountBDT: 2000.0,
          currency: "BDT",
          status: PaymentStatus.CAPTURED,
          method: PaymentMethod.CARD,
          gatewayRef: "mock-gateway-ref",
        },
      });

      customerToken = "mock-customer-token";
      paymentId = payment.id;
    });

    it("should refund payment", () => {
      return pactum
        .spec()
        .post(`/payments/${paymentId}/refund`)
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          amount: 1000.0,
          reason: "Customer requested partial refund",
          metadata: {
            adminNote: "Partial refund processed",
          },
        })
        .expectStatus(200)
        .expectJsonLike({
          id: paymentId,
          status: PaymentStatus.REFUNDED,
          amountBDT: 2000.0,
        });
    });

    it("should fail to refund non-existent payment", () => {
      return pactum
        .spec()
        .post("/payments/non-existent/refund")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          amount: 1000.0,
          reason: "Customer requested refund",
        })
        .expectStatus(404);
    });
  });

  describe("Payment Webhook", () => {
    it("should process webhook successfully", () => {
      return pactum
        .spec()
        .post("/payments/webhook")
        .withHeaders({
          "x-webhook-signature": "valid-signature",
        })
        .withJson({
          eventType: "payment.captured",
          paymentId: "gateway-ref-123",
          status: "CAPTURED",
          amount: 2000.0,
          currency: "BDT",
        })
        .expectStatus(200)
        .expectJsonLike({
          success: true,
        });
    });

    it("should handle invalid webhook signature", () => {
      return pactum
        .spec()
        .post("/payments/webhook")
        .withHeaders({
          "x-webhook-signature": "invalid-signature",
        })
        .withJson({
          eventType: "payment.captured",
          paymentId: "gateway-ref-123",
        })
        .expectStatus(200)
        .expectJsonLike({
          success: false,
        });
    });
  });
});






























