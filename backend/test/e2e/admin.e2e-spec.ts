import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/core/prisma.service";

describe("Admin (e2e)", () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let adminToken: string;
  let customerToken: string;
  let professionalToken: string;
  let adminUser: any;
  let customerUser: any;
  let professionalUser: any;
  let testBooking: any;
  let testDispute: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    // Create test users
    adminUser = await prismaService.user.create({
      data: {
        email: "admin@test.com",
        fullName: "Admin User",
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

    professionalUser = await prismaService.user.create({
      data: {
        email: "professional@test.com",
        fullName: "Professional User",
        password: "hashedpassword",
        isEmailVerified: true,
        isActive: true,
      },
    });

    // Create roles
    const adminRole = await prismaService.role.create({
      data: { name: "ADMIN", description: "Administrator" },
    });

    const customerRole = await prismaService.role.create({
      data: { name: "CUSTOMER", description: "Customer" },
    });

    const professionalRole = await prismaService.role.create({
      data: { name: "PROFESSIONAL", description: "Professional" },
    });

    // Assign roles
    await prismaService.userRole.createMany({
      data: [
        { userId: adminUser.id, roleId: adminRole.id },
        { userId: customerUser.id, roleId: customerRole.id },
        { userId: professionalUser.id, roleId: professionalRole.id },
      ],
    });

    // Create professional profile
    await prismaService.professionalProfile.create({
      data: {
        userId: professionalUser.id,
        skills: ["cleaning", "maintenance"],
        categories: ["cleaning"],
        isVerified: false,
      },
    });

    // Create test category
    const testCategory = await prismaService.serviceCategory.create({
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
        addressText: "Test Address",
        pricingModel: "HOURLY",
        quotedPriceBDT: 1000,
        finalAmountBDT: 1000,
      },
    });

    // Create test dispute
    testDispute = await prismaService.dispute.create({
      data: {
        bookingId: testBooking.id,
        raisedBy: customerUser.id,
        type: "PAYMENT",
        details: "Test dispute for e2e testing",
        status: "PENDING",
      },
    });

    // Get auth tokens (simplified for testing)
    adminToken = "mock-admin-token";
    customerToken = "mock-customer-token";
    professionalToken = "mock-professional-token";
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.dispute.deleteMany();
    await prismaService.booking.deleteMany();
    await prismaService.professionalProfile.deleteMany();
    await prismaService.userRole.deleteMany();
    await prismaService.role.deleteMany();
    await prismaService.user.deleteMany();
    await prismaService.serviceCategory.deleteMany();
    await app.close();
  });

  describe("/admin/professionals/:id/approve (PATCH)", () => {
    it("should approve a professional", () => {
      return request(app.getHttpServer())
        .patch(`/admin/professionals/${professionalUser.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", professionalUser.id);
          expect(res.body).toHaveProperty("isVerified", true);
        });
    });

    it("should return 404 for non-existent professional", () => {
      return request(app.getHttpServer())
        .patch("/admin/professionals/non-existent/approve")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });

    it("should return 403 for non-admin user", () => {
      return request(app.getHttpServer())
        .patch(`/admin/professionals/${professionalUser.id}/approve`)
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  describe("/admin/professionals/:id/reject (PATCH)", () => {
    it("should reject a professional", () => {
      return request(app.getHttpServer())
        .patch(`/admin/professionals/${professionalUser.id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", professionalUser.id);
          expect(res.body).toHaveProperty("isVerified", false);
        });
    });
  });

  describe("/admin/users/:id/ban (PATCH)", () => {
    it("should ban a user", () => {
      return request(app.getHttpServer())
        .patch(`/admin/users/${customerUser.id}/ban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", customerUser.id);
          expect(res.body).toHaveProperty("isActive", false);
        });
    });

    it("should return 404 for non-existent user", () => {
      return request(app.getHttpServer())
        .patch("/admin/users/non-existent/ban")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe("/admin/users/:id/unban (PATCH)", () => {
    it("should unban a user", () => {
      return request(app.getHttpServer())
        .patch(`/admin/users/${customerUser.id}/unban`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", customerUser.id);
          expect(res.body).toHaveProperty("isActive", true);
        });
    });
  });

  describe("/admin/disputes (GET)", () => {
    it("should get all disputes", () => {
      return request(app.getHttpServer())
        .get("/admin/disputes")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("disputes");
          expect(res.body).toHaveProperty("pagination");
          expect(Array.isArray(res.body.disputes)).toBe(true);
        });
    });

    it("should filter disputes by status", () => {
      return request(app.getHttpServer())
        .get("/admin/disputes?status=PENDING")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("disputes");
          expect(
            res.body.disputes.every((d: any) => d.status === "PENDING")
          ).toBe(true);
        });
    });

    it("should filter disputes by type", () => {
      return request(app.getHttpServer())
        .get("/admin/disputes?type=PAYMENT")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("disputes");
          expect(
            res.body.disputes.every((d: any) => d.type === "PAYMENT")
          ).toBe(true);
        });
    });
  });

  describe("/admin/disputes/:id/resolve (POST)", () => {
    it("should resolve a dispute", () => {
      return request(app.getHttpServer())
        .post(`/admin/disputes/${testDispute.id}/resolve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ resolution: "Dispute resolved in favor of customer" })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("status", "RESOLVED");
          expect(res.body).toHaveProperty(
            "resolution",
            "Dispute resolved in favor of customer"
          );
        });
    });

    it("should return 404 for non-existent dispute", () => {
      return request(app.getHttpServer())
        .post("/admin/disputes/non-existent/resolve")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ resolution: "Test resolution" })
        .expect(404);
    });
  });

  describe("/admin/config/commission (GET)", () => {
    it("should get commission settings", () => {
      return request(app.getHttpServer())
        .get("/admin/config/commission")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("settings");
          expect(res.body).toHaveProperty("pagination");
          expect(Array.isArray(res.body.settings)).toBe(true);
        });
    });
  });

  describe("/admin/config/commission (PATCH)", () => {
    it("should update commission settings", () => {
      return request(app.getHttpServer())
        .patch("/admin/config/commission")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ percent: 20 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("percent", 20);
          expect(res.body).toHaveProperty("categoryId", null);
        });
    });

    it("should validate commission percentage", () => {
      return request(app.getHttpServer())
        .patch("/admin/config/commission")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ percent: 150 })
        .expect(400);
    });
  });

  describe("/admin/config/commission (POST)", () => {
    it("should create commission setting", () => {
      return request(app.getHttpServer())
        .post("/admin/config/commission")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ percent: 15.5 })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("percent", 15.5);
        });
    });
  });

  describe("/admin/moderation/reviews/flagged (GET)", () => {
    it("should get flagged reviews", () => {
      return request(app.getHttpServer())
        .get("/admin/moderation/reviews/flagged")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("reviews");
          expect(res.body).toHaveProperty("pagination");
          expect(Array.isArray(res.body.reviews)).toBe(true);
        });
    });
  });

  describe("/admin/moderation/reviews/:id/moderate (PATCH)", () => {
    it("should moderate a review", async () => {
      // Create a test review first
      const testReview = await prismaService.review.create({
        data: {
          bookingId: testBooking.id,
          customerId: customerUser.id,
          professionalId: professionalUser.id,
          rating: 1,
          comment: "Bad service",
          flagged: true,
        },
      });

      return request(app.getHttpServer())
        .patch(`/admin/moderation/reviews/${testReview.id}/moderate`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "APPROVED", reason: "Review is appropriate" })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("action", "APPROVED");
          expect(res.body).toHaveProperty("reason", "Review is appropriate");
        });
    });

    it("should return 404 for non-existent review", () => {
      return request(app.getHttpServer())
        .patch("/admin/moderation/reviews/non-existent/moderate")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "APPROVED" })
        .expect(404);
    });
  });

  describe("/admin/moderation/uploads (GET)", () => {
    it("should get uploads for moderation", () => {
      return request(app.getHttpServer())
        .get("/admin/moderation/uploads")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("uploads");
          expect(res.body).toHaveProperty("pagination");
          expect(Array.isArray(res.body.uploads)).toBe(true);
        });
    });
  });

  describe("/admin/analytics/summary (GET)", () => {
    it("should get analytics summary", () => {
      return request(app.getHttpServer())
        .get("/admin/analytics/summary")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("revenue");
          expect(res.body).toHaveProperty("bookings");
          expect(res.body).toHaveProperty("users");
          expect(res.body).toHaveProperty("topServices");
          expect(res.body).toHaveProperty("period");
        });
    });

    it("should filter analytics by date range", () => {
      return request(app.getHttpServer())
        .get(
          "/admin/analytics/summary?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z"
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.period.startDate).toBe("2024-01-01T00:00:00Z");
          expect(res.body.period.endDate).toBe("2024-12-31T23:59:59Z");
        });
    });
  });

  describe("Authorization", () => {
    it("should return 401 without token", () => {
      return request(app.getHttpServer()).get("/admin/users").expect(401);
    });

    it("should return 403 for non-admin user", () => {
      return request(app.getHttpServer())
        .get("/admin/users")
        .set("Authorization", `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});





























