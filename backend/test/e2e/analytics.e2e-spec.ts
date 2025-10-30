import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/core/prisma.service";

describe("Analytics (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let professionalToken: string;
  let customerToken: string;
  let adminToken: string;
  let professionalUser: any;
  let customerUser: any;
  let adminUser: any;
  let testCategory: any;
  let testBooking: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test users
    professionalUser = await prismaService.user.create({
      data: {
        email: "professional@test.com",
        fullName: "Professional User",
        password: "hashedpassword",
        isEmailVerified: true,
        isActive: true,
      },
    });

    customerUser = await prismaService.user.create({
      data: {
        email: "customer@test.com",
        fullName: "Customer User",
        password: "hashedpassword",
        isEmailVerified: true,
        isActive: true,
      },
    });

    adminUser = await prismaService.user.create({
      data: {
        email: "admin@test.com",
        fullName: "Admin User",
        password: "hashedpassword",
        isEmailVerified: true,
        isActive: true,
      },
    });

    // Create roles
    const professionalRole = await prismaService.role.create({
      data: { name: "PROFESSIONAL", description: "Professional" },
    });

    const customerRole = await prismaService.role.create({
      data: { name: "CUSTOMER", description: "Customer" },
    });

    const adminRole = await prismaService.role.create({
      data: { name: "ADMIN", description: "Administrator" },
    });

    // Assign roles
    await prismaService.userRole.createMany({
      data: [
        { userId: professionalUser.id, roleId: professionalRole.id },
        { userId: customerUser.id, roleId: customerRole.id },
        { userId: adminUser.id, roleId: adminRole.id },
      ],
    });

    // Create professional profile
    await prismaService.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        skills: ["cleaning", "maintenance"],
        categories: ["cleaning"],
        isVerified: true,
      },
    });

    // Create test category
    testCategory = await prismaService.serviceCategory.create({
      data: {
        name: "Test Category",
        slug: "test-category",
        description: "Test category for e2e tests",
      },
    });

    // Create test booking
    testBooking = await prismaService.booking.create({
      data: {
        customerId: customerUser.id,
        professionalId: professionalUser.id,
        categoryId: testCategory.id,
        status: "COMPLETED",
        scheduledAt: new Date(),
        addressText: "Test Address, Dhaka",
        lat: 23.8103,
        lng: 90.4125,
        pricingModel: "HOURLY",
        quotedPriceBDT: 1000,
        finalAmountBDT: 1000,
        commissionPercent: 15.0,
      },
    });

    // Create test review
    await prismaService.review.create({
      data: {
        bookingId: testBooking.id,
        customerId: customerUser.id,
        professionalId: professionalUser.id,
        rating: 5,
        comment: "Great service!",
      },
    });

    // Get auth tokens (simplified for testing)
    professionalToken = "mock-professional-token";
    customerToken = "mock-customer-token";
    adminToken = "mock-admin-token";
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.review.deleteMany();
    await prismaService.booking.deleteMany();
    await prismaService.professionalProfile.deleteMany();
    await prismaService.userRole.deleteMany();
    await prismaService.role.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.serviceCategory.deleteMany();
    await app.close();
  });

  describe("/analytics/pro/me (GET)", () => {
    it("should get professional analytics", () => {
      return request(app.getHttpServer())
        .get("/analytics/pro/me")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("earnings");
          expect(res.body).toHaveProperty("ratings");
          expect(res.body).toHaveProperty("bookings");
          expect(res.body).toHaveProperty("topCategories");
          expect(res.body).toHaveProperty("monthlyTrend");
          expect(res.body).toHaveProperty("period");
        });
    });

    it("should filter professional analytics by period", () => {
      return request(app.getHttpServer())
        .get("/analytics/pro/me?period=MONTH&periods=6")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("period");
          expect(res.body.period.type).toBe("MONTH");
        });
    });

    it("should filter professional analytics by category", () => {
      return request(app.getHttpServer())
        .get(`/analytics/pro/me?categoryId=${testCategory.id}`)
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("earnings");
          expect(res.body).toHaveProperty("bookings");
        });
    });

    it("should return 403 for non-professional user", () => {
      return request(app.getHttpServer())
        .get("/analytics/pro/me")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe("/analytics/cu/me (GET)", () => {
    it("should get customer analytics", () => {
      return request(app.getHttpServer())
        .get("/analytics/cu/me")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("spending");
          expect(res.body).toHaveProperty("bookings");
          expect(res.body).toHaveProperty("topCategories");
          expect(res.body).toHaveProperty("monthlyTrend");
          expect(res.body).toHaveProperty("averageRating");
          expect(res.body).toHaveProperty("period");
        });
    });

    it("should filter customer analytics by date range", () => {
      return request(app.getHttpServer())
        .get("/analytics/cu/me?startDate=2024-01-01&endDate=2024-12-31")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("period");
          expect(res.body.period.start).toBeDefined();
          expect(res.body.period.end).toBeDefined();
        });
    });

    it("should return 403 for non-customer user", () => {
      return request(app.getHttpServer())
        .get("/analytics/cu/me")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(403);
    });
  });

  describe("/analytics/ad/overview (GET)", () => {
    it("should get admin analytics overview", () => {
      return request(app.getHttpServer())
        .get("/analytics/ad/overview")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("mrr");
          expect(res.body).toHaveProperty("serviceDistribution");
          expect(res.body).toHaveProperty("geoHeat");
          expect(res.body).toHaveProperty("userGrowth");
          expect(res.body).toHaveProperty("bookingTrends");
          expect(res.body).toHaveProperty("revenue");
          expect(res.body).toHaveProperty("period");
        });
    });

    it("should filter admin analytics by region", () => {
      return request(app.getHttpServer())
        .get("/analytics/ad/overview?region=Dhaka")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("geoHeat");
          expect(res.body).toHaveProperty("serviceDistribution");
        });
    });

    it("should return 403 for non-admin user", () => {
      return request(app.getHttpServer())
        .get("/analytics/ad/overview")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe("/analytics/reports/:scope.csv (GET)", () => {
    it("should export professional analytics as CSV", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/professional.csv")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect("Content-Type", "text/csv; charset=utf-8")
        .expect(
          "Content-Disposition",
          /attachment; filename="professional-analytics-/
        );
    });

    it("should export customer analytics as CSV", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/customer.csv")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect("Content-Type", "text/csv; charset=utf-8")
        .expect(
          "Content-Disposition",
          /attachment; filename="customer-analytics-/
        );
    });

    it("should export admin analytics as CSV", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/admin.csv")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", "text/csv; charset=utf-8")
        .expect(
          "Content-Disposition",
          /attachment; filename="admin-analytics-/
        );
    });

    it("should filter CSV export by date range", () => {
      return request(app.getHttpServer())
        .get(
          "/analytics/reports/professional.csv?startDate=2024-01-01&endDate=2024-12-31"
        )
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect("Content-Type", "text/csv; charset=utf-8");
    });

    it("should return 400 for invalid scope", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/invalid.csv")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe("/analytics/reports/:scope.pdf (GET)", () => {
    it("should export professional analytics as PDF", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/professional.pdf")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(200)
        .expect("Content-Type", "application/pdf")
        .expect(
          "Content-Disposition",
          /attachment; filename="professional-analytics-/
        );
    });

    it("should export customer analytics as PDF", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/customer.pdf")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(200)
        .expect("Content-Type", "application/pdf")
        .expect(
          "Content-Disposition",
          /attachment; filename="customer-analytics-/
        );
    });

    it("should export admin analytics as PDF", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/admin.pdf")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", "application/pdf")
        .expect(
          "Content-Disposition",
          /attachment; filename="admin-analytics-/
        );
    });

    it("should filter PDF export by period", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/admin.pdf?period=MONTH")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect("Content-Type", "application/pdf");
    });

    it("should return 400 for invalid scope", () => {
      return request(app.getHttpServer())
        .get("/analytics/reports/invalid.pdf")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe("Authorization", () => {
    it("should return 401 without token", () => {
      return request(app.getHttpServer()).get("/analytics/pro/me").expect(401);
    });

    it("should return 403 for wrong role access", () => {
      return request(app.getHttpServer())
        .get("/analytics/ad/overview")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe("Data Validation", () => {
    it("should validate period parameter", () => {
      return request(app.getHttpServer())
        .get("/analytics/pro/me?period=INVALID")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(400);
    });

    it("should validate periods parameter range", () => {
      return request(app.getHttpServer())
        .get("/analytics/pro/me?periods=100")
        .set("Authorization", `Bearer ${professionalToken}`)
        .expect(400);
    });

    it("should validate date format", () => {
      return request(app.getHttpServer())
        .get("/analytics/cu/me?startDate=invalid-date")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(400);
    });
  });
});





























