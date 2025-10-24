import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/core/prisma.service";
import { LoggerService } from "@/core/logger.service";
import { BookingStatus, PricingModel } from "@/modules/booking/dto";

describe("BookingController (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let customerToken: string;
  let professionalToken: string;
  let adminToken: string;
  let customerId: string;
  let professionalId: string;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test users and get tokens
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test customer
    const customer = await prismaService.user.create({
      data: {
        email: "customer@test.com",
        fullName: "Test Customer",
        phone: "+8801712345678",
        password: "$2b$12$hashedpassword",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });
    customerId = customer.id;

    // Create test professional
    const professional = await prismaService.user.create({
      data: {
        email: "professional@test.com",
        fullName: "Test Professional",
        phone: "+8801712345679",
        password: "$2b$12$hashedpassword",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });
    professionalId = professional.id;

    // Create test admin
    const admin = await prismaService.user.create({
      data: {
        email: "admin@test.com",
        fullName: "Test Admin",
        phone: "+8801712345680",
        password: "$2b$12$hashedpassword",
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    // Create roles
    const customerRole = await prismaService.role.findUnique({
      where: { name: "CUSTOMER" },
    });
    const professionalRole = await prismaService.role.findUnique({
      where: { name: "PROFESSIONAL" },
    });
    const adminRole = await prismaService.role.findUnique({
      where: { name: "ADMIN" },
    });

    // Assign roles
    await prismaService.userRole.create({
      data: { userId: customerId, roleId: customerRole!.id },
    });
    await prismaService.userRole.create({
      data: { userId: professionalId, roleId: professionalRole!.id },
    });
    await prismaService.userRole.create({
      data: { userId: admin.id, roleId: adminRole!.id },
    });

    // Create professional profile
    await prismaService.professionalProfile.create({
      data: {
        userId: professionalId,
        skills: ["Cleaning", "Maintenance"],
        categories: [],
        hourlyRateBDT: 1000,
        isVerified: true,
      },
    });

    // Create test category
    const category = await prismaService.serviceCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        description: "Test category for e2e tests",
        isActive: true,
      },
    });
    categoryId = category.id;

    // Get tokens (simplified - in real tests you'd use actual auth endpoints)
    customerToken = "customer-jwt-token";
    professionalToken = "professional-jwt-token";
    adminToken = "admin-jwt-token";
  }

  async function cleanupTestData() {
    await prismaService.bookingEvent.deleteMany({
      where: { booking: { customerId } },
    });
    await prismaService.booking.deleteMany({
      where: { customerId },
    });
    await prismaService.professionalProfile.deleteMany({
      where: { userId: professionalId },
    });
    await prismaService.userRole.deleteMany({
      where: { userId: { in: [customerId, professionalId] } },
    });
    await prismaService.serviceCategory.deleteMany({
      where: { slug: "test-category" },
    });
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: ["customer@test.com", "professional@test.com", "admin@test.com"],
        },
      },
    });
  }

  describe("POST /bookings", () => {
    it("should create a booking", () => {
      const createBookingDto = {
        professionalId,
        categoryId,
        scheduledAt: "2024-02-01T10:00:00.000Z",
        addressText: "123 Test Street, Dhaka, Bangladesh",
        lat: 23.8103,
        lng: 90.4125,
        details: "Test booking details",
        pricingModel: PricingModel.HOURLY,
        quotedPriceBDT: 2000.0,
        commissionPercent: 15.0,
      };

      return request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(createBookingDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body.status).toBe(BookingStatus.PENDING);
          expect(res.body.professionalId).toBe(professionalId);
          expect(res.body.categoryId).toBe(categoryId);
          expect(res.body.pricingModel).toBe(PricingModel.HOURLY);
          expect(res.body.quotedPriceBDT).toBe(2000.0);
        });
    });

    it("should fail to create booking with invalid professional", () => {
      const createBookingDto = {
        professionalId: "invalid-id",
        categoryId,
        scheduledAt: "2024-02-01T10:00:00.000Z",
        addressText: "123 Test Street, Dhaka, Bangladesh",
        pricingModel: PricingModel.HOURLY,
        quotedPriceBDT: 2000.0,
      };

      return request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(createBookingDto)
        .expect(404);
    });

    it("should fail to create booking with past scheduled time", () => {
      const createBookingDto = {
        professionalId,
        categoryId,
        scheduledAt: "2020-01-01T10:00:00.000Z",
        addressText: "123 Test Street, Dhaka, Bangladesh",
        pricingModel: PricingModel.HOURLY,
        quotedPriceBDT: 2000.0,
      };

      return request(app.getHttpServer())
        .post("/bookings")
        .set("Authorization", `Bearer ${customerToken}`)
        .send(createBookingDto)
        .expect(400);
    });
  });

  describe("GET /bookings", () => {
    let bookingId: string;

    beforeAll(async () => {
      // Create a test booking
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.PENDING,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });
      bookingId = booking.id;

      // Create booking event
      await prismaService.bookingEvent.create({
        data: {
          bookingId,
          type: "CREATED",
          metadata: { test: true },
        },
      });
    });

    it("should get customer bookings", () => {
      return request(app.getHttpServer())
        .get("/bookings")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("bookings");
          expect(res.body).toHaveProperty("total");
          expect(res.body.bookings).toBeInstanceOf(Array);
          expect(res.body.total).toBeGreaterThan(0);
        });
    });

    it("should get professional bookings", () => {
      return request(app.getHttpServer())
        .get("/bookings")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("bookings");
          expect(res.body).toHaveProperty("total");
          expect(res.body.bookings).toBeInstanceOf(Array);
        });
    });

    it("should filter bookings by status", () => {
      return request(app.getHttpServer())
        .get("/bookings")
        .query({ status: BookingStatus.PENDING })
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.bookings).toBeInstanceOf(Array);
          if (res.body.bookings.length > 0) {
            expect(res.body.bookings[0].status).toBe(BookingStatus.PENDING);
          }
        });
    });
  });

  describe("GET /bookings/:id", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.PENDING,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });
      bookingId = booking.id;
    });

    it("should get booking by id", () => {
      return request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", bookingId);
          expect(res.body).toHaveProperty("status");
          expect(res.body).toHaveProperty("customer");
          expect(res.body).toHaveProperty("professional");
          expect(res.body).toHaveProperty("category");
        });
    });

    it("should get booking by id as professional", () => {
      return request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", bookingId);
        });
    });

    it("should fail to get booking with unauthorized access", () => {
      return request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set("Authorization", `Bearer invalid-token`)
        .expect(401);
    });
  });

  describe("POST /bookings/:id/accept", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.PENDING,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });
      bookingId = booking.id;

      await prismaService.bookingEvent.create({
        data: {
          bookingId,
          type: "CREATED",
          metadata: {},
        },
      });
    });

    it("should accept booking", () => {
      const acceptDto = { message: "I'll be there on time" };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/accept`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send(acceptDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(BookingStatus.ACCEPTED);
        });
    });

    it("should fail to accept booking as customer", () => {
      const acceptDto = { message: "I'll be there on time" };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/accept`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send(acceptDto)
        .expect(403);
    });
  });

  describe("POST /bookings/:id/check-in", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.ACCEPTED,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });
      bookingId = booking.id;

      await prismaService.bookingEvent.createMany({
        data: [
          {
            bookingId,
            type: "CREATED",
            metadata: {},
          },
          {
            bookingId,
            type: "ACCEPTED",
            metadata: {},
          },
        ],
      });
    });

    it("should check in to booking", () => {
      const checkInDto = {
        notes: "Starting work now",
        lat: 23.8103,
        lng: 90.4125,
      };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-in`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send(checkInDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(BookingStatus.IN_PROGRESS);
        });
    });
  });

  describe("POST /bookings/:id/check-out", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.IN_PROGRESS,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
          checkInAt: new Date(),
        },
      });
      bookingId = booking.id;

      await prismaService.bookingEvent.createMany({
        data: [
          {
            bookingId,
            type: "CREATED",
            metadata: {},
          },
          {
            bookingId,
            type: "ACCEPTED",
            metadata: {},
          },
          {
            bookingId,
            type: "CHECKED_IN",
            metadata: {},
          },
        ],
      });
    });

    it("should check out from booking", () => {
      const checkOutDto = {
        notes: "Work completed successfully",
        actualHours: 2.5,
        lat: 23.8103,
        lng: 90.4125,
      };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/check-out`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send(checkOutDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("checkOutAt");
          expect(res.body.actualHours).toBe(2.5);
        });
    });
  });

  describe("POST /bookings/:id/complete", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.IN_PROGRESS,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 1000.0,
          commissionPercent: 15.0,
          checkInAt: new Date(),
          checkOutAt: new Date(),
          actualHours: 2.5,
        },
      });
      bookingId = booking.id;

      await prismaService.bookingEvent.createMany({
        data: [
          {
            bookingId,
            type: "CREATED",
            metadata: {},
          },
          {
            bookingId,
            type: "ACCEPTED",
            metadata: {},
          },
          {
            bookingId,
            type: "CHECKED_IN",
            metadata: {},
          },
          {
            bookingId,
            type: "CHECKED_OUT",
            metadata: {},
          },
        ],
      });
    });

    it("should complete booking", () => {
      const completeDto = {
        notes: "All work completed as requested",
        actualHours: 2.5,
        finalAmountBDT: 2500.0,
      };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/complete`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .send(completeDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(BookingStatus.COMPLETED);
          expect(res.body.finalAmountBDT).toBe(2500.0);
        });
    });
  });

  describe("POST /bookings/:id/cancel", () => {
    let bookingId: string;

    beforeAll(async () => {
      const booking = await prismaService.booking.create({
        data: {
          customerId,
          professionalId,
          categoryId,
          status: BookingStatus.PENDING,
          scheduledAt: new Date("2024-02-01T10:00:00.000Z"),
          addressText: "123 Test Street, Dhaka, Bangladesh",
          pricingModel: PricingModel.HOURLY,
          quotedPriceBDT: 2000.0,
          commissionPercent: 15.0,
        },
      });
      bookingId = booking.id;

      await prismaService.bookingEvent.create({
        data: {
          bookingId,
          type: "CREATED",
          metadata: {},
        },
      });
    });

    it("should cancel booking as customer", () => {
      const cancelDto = { reason: "Customer requested cancellation" };

      return request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send(cancelDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe(BookingStatus.CANCELLED);
          expect(res.body.cancelReason).toBe("Customer requested cancellation");
        });
    });
  });

  describe("GET /bookings/stats/overview", () => {
    it("should get booking statistics for customer", () => {
      return request(app.getHttpServer())
        .get("/bookings/stats/overview")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("total");
          expect(res.body).toHaveProperty("pending");
          expect(res.body).toHaveProperty("accepted");
          expect(res.body).toHaveProperty("inProgress");
          expect(res.body).toHaveProperty("completed");
          expect(res.body).toHaveProperty("cancelled");
          expect(res.body).toHaveProperty("totalRevenue");
          expect(res.body).toHaveProperty("totalCommission");
        });
    });

    it("should get booking statistics for professional", () => {
      return request(app.getHttpServer())
        .get("/bookings/stats/overview")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("total");
          expect(res.body).toHaveProperty("totalRevenue");
          expect(res.body).toHaveProperty("totalCommission");
        });
    });
  });
});






























