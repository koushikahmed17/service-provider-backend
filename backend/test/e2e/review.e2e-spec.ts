import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { ReviewModule } from "@/modules/review/review.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { BookingModule } from "@/modules/booking/booking.module";
import { ServiceCatalogModule } from "@/modules/service-catalog/service-catalog.module";
import * as pactum from "pactum";

describe("Review (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReviewModule, AuthModule, BookingModule, ServiceCatalogModule],
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
    await prismaService.reviewModerationLog.deleteMany();
    await prismaService.reviewResponse.deleteMany();
    await prismaService.review.deleteMany();
    await prismaService.professionalRatingAggregate.deleteMany();
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

  describe("Review Creation", () => {
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

      // Get auth tokens (simplified for e2e)
      customerToken = "mock-customer-token";
      professionalToken = "mock-professional-token";
      bookingId = booking.id;
      categoryId = category.id;
    });

    it("should create a review successfully", () => {
      return pactum
        .spec()
        .post("/reviews")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          bookingId,
          rating: 5,
          comment: "Excellent service! Very professional and punctual.",
          photos: ["https://example.com/photo1.jpg"],
        })
        .expectStatus(201)
        .expectJsonLike({
          bookingId,
          rating: 5,
          comment: "Excellent service! Very professional and punctual.",
          photos: ["https://example.com/photo1.jpg"],
          flagged: false,
        });
    });

    it("should fail to create review for non-existent booking", () => {
      return pactum
        .spec()
        .post("/reviews")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          bookingId: "non-existent",
          rating: 5,
          comment: "Great service!",
        })
        .expectStatus(404);
    });

    it("should fail to create review for non-completed booking", async () => {
      // Create a pending booking
      const pendingBooking = await prismaService.booking.create({
        data: {
          customerId: "customer-123",
          professionalId: "professional-123",
          categoryId: categoryId,
          status: "PENDING",
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

      return pactum
        .spec()
        .post("/reviews")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          bookingId: pendingBooking.id,
          rating: 5,
          comment: "Great service!",
        })
        .expectStatus(400);
    });
  });

  describe("Review Retrieval", () => {
    let professionalId: string;

    beforeEach(async () => {
      // Create test data
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
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

      const review = await prismaService.review.create({
        data: {
          bookingId: booking.id,
          customerId: customer.id,
          professionalId: professional.id,
          rating: 5,
          comment: "Excellent service!",
          photos: [],
          flagged: false,
        },
      });

      professionalId = professional.id;
    });

    it("should get reviews for a professional", () => {
      return pactum
        .spec()
        .get(`/reviews/professionals/${professionalId}`)
        .withHeaders({
          Authorization: `Bearer mock-token`,
        })
        .expectStatus(200)
        .expectJsonLike({
          reviews: [
            {
              professionalId,
              rating: 5,
              comment: "Excellent service!",
              flagged: false,
            },
          ],
          total: 1,
          avgRating: 5,
        });
    });

    it("should get professional rating aggregate", () => {
      return pactum
        .spec()
        .get(`/reviews/professionals/${professionalId}/rating`)
        .withHeaders({
          Authorization: `Bearer mock-token`,
        })
        .expectStatus(200)
        .expectJsonLike({
          professionalId,
          avgRating: 5,
          totalReviews: 1,
        });
    });
  });

  describe("Review Response", () => {
    let reviewId: string;
    let professionalToken: string;

    beforeEach(async () => {
      // Create test data
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
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

      const review = await prismaService.review.create({
        data: {
          bookingId: booking.id,
          customerId: customer.id,
          professionalId: professional.id,
          rating: 5,
          comment: "Excellent service!",
          photos: [],
          flagged: false,
        },
      });

      reviewId = review.id;
      professionalToken = "mock-professional-token";
    });

    it("should create a review response", () => {
      return pactum
        .spec()
        .post(`/reviews/${reviewId}/respond`)
        .withHeaders({
          Authorization: `Bearer ${professionalToken}`,
        })
        .withJson({
          comment:
            "Thank you for your feedback! I'm glad you were satisfied with the service.",
        })
        .expectStatus(201)
        .expectJsonLike({
          response: {
            comment:
              "Thank you for your feedback! I'm glad you were satisfied with the service.",
          },
        });
    });

    it("should fail to create response for non-existent review", () => {
      return pactum
        .spec()
        .post("/reviews/non-existent/respond")
        .withHeaders({
          Authorization: `Bearer ${professionalToken}`,
        })
        .withJson({
          comment: "Thank you!",
        })
        .expectStatus(404);
    });
  });

  describe("Review Flagging", () => {
    let reviewId: string;
    let customerToken: string;

    beforeEach(async () => {
      // Create test data
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
          scheduledAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

      const review = await prismaService.review.create({
        data: {
          bookingId: booking.id,
          customerId: customer.id,
          professionalId: professional.id,
          rating: 5,
          comment: "Excellent service!",
          photos: [],
          flagged: false,
        },
      });

      reviewId = review.id;
      customerToken = "mock-customer-token";
    });

    it("should flag a review", () => {
      return pactum
        .spec()
        .post(`/reviews/${reviewId}/flag`)
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          reason: "Inappropriate language",
          details: "The review contains offensive content",
        })
        .expectStatus(200);
    });

    it("should fail to flag non-existent review", () => {
      return pactum
        .spec()
        .post("/reviews/non-existent/flag")
        .withHeaders({
          Authorization: `Bearer ${customerToken}`,
        })
        .withJson({
          reason: "Inappropriate language",
        })
        .expectStatus(404);
    });
  });
});































