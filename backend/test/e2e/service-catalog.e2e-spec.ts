import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../../src/app.module";

describe("Service Catalog (e2e)", () => {
  let app: INestApplication;
  let accessToken: string;
  let professionalId: string;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login as professional to get access token
    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "professional@example.com",
        password: "professional123",
        loginType: "PASSWORD",
      });

    accessToken = loginResponse.body.accessToken;

    // Get professional profile ID
    const profileResponse = await request(app.getHttpServer())
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);

    professionalId = profileResponse.body.professionalProfile.id;

    // Get a category ID for testing
    const categoriesResponse = await request(app.getHttpServer()).get(
      "/api/v1/catalog/categories"
    );

    categoryId = categoriesResponse.body[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("/catalog/categories (GET)", () => {
    it("should return all active categories", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/categories")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty("id");
          expect(res.body[0]).toHaveProperty("name");
          expect(res.body[0]).toHaveProperty("slug");
          expect(res.body[0]).toHaveProperty("isActive", true);
        });
    });

    it("should return categories in tree format", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/categories?tree=true")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          // Check if any category has children (indicating tree structure)
          const hasChildren = res.body.some(
            (cat: any) => cat.children && cat.children.length > 0
          );
          expect(hasChildren).toBe(true);
        });
    });
  });

  describe("/catalog/search (GET)", () => {
    it("should search services with basic filters", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/search?query=cleaning&minPrice=100&maxPrice=1000")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });

    it("should search services with geo filters", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/search?lat=23.8103&lng=90.4125&radiusKm=10")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });

    it("should return empty array for no results", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/search?query=nonexistent")
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual([]);
        });
    });
  });

  describe("/catalog/suggestions (GET)", () => {
    it("should return search suggestions", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/suggestions?q=clean")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty("suggestion");
          expect(res.body[0]).toHaveProperty("type");
        });
    });
  });

  describe("/catalog/popular (GET)", () => {
    it("should return popular categories", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/popular")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty("id");
          expect(res.body[0]).toHaveProperty("name");
          expect(res.body[0]).toHaveProperty("_count");
        });
    });
  });

  describe("/catalog/pro/services (POST)", () => {
    it("should create a professional service", () => {
      return request(app.getHttpServer())
        .post("/api/v1/catalog/pro/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          categoryId,
          rateType: "HOURLY",
          hourlyRateBDT: 500,
          minHours: 2,
          notes: "Test professional service",
          isActive: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("id");
          expect(res.body).toHaveProperty("rateType", "HOURLY");
          expect(res.body).toHaveProperty("hourlyRateBDT", 500);
          expect(res.body).toHaveProperty("professionalId", professionalId);
        });
    });

    it("should fail with invalid category ID", () => {
      return request(app.getHttpServer())
        .post("/api/v1/catalog/pro/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          categoryId: "invalid-id",
          rateType: "HOURLY",
          hourlyRateBDT: 500,
        })
        .expect(404);
    });

    it("should fail without authentication", () => {
      return request(app.getHttpServer())
        .post("/api/v1/catalog/pro/services")
        .send({
          categoryId,
          rateType: "HOURLY",
          hourlyRateBDT: 500,
        })
        .expect(401);
    });
  });

  describe("/catalog/pro/services (GET)", () => {
    it("should return professional's services", () => {
      return request(app.getHttpServer())
        .get("/api/v1/catalog/pro/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty("id");
          expect(res.body[0]).toHaveProperty("professionalId", professionalId);
        });
    });
  });

  describe("/catalog/pro/services/:id (PATCH)", () => {
    let serviceId: string;

    beforeAll(async () => {
      // Create a service first
      const response = await request(app.getHttpServer())
        .post("/api/v1/catalog/pro/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          categoryId,
          rateType: "FIXED",
          fixedPriceBDT: 2000,
          notes: "Test service for update",
          isActive: true,
        });

      serviceId = response.body.id;
    });

    it("should update professional service", () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/catalog/pro/services/${serviceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          rateType: "HOURLY",
          hourlyRateBDT: 600,
          notes: "Updated service description",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty("id", serviceId);
          expect(res.body).toHaveProperty("rateType", "HOURLY");
          expect(res.body).toHaveProperty("hourlyRateBDT", 600);
        });
    });

    it("should fail with invalid service ID", () => {
      return request(app.getHttpServer())
        .patch("/api/v1/catalog/pro/services/invalid-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          notes: "Updated description",
        })
        .expect(404);
    });
  });

  describe("/catalog/pro/services/:id (DELETE)", () => {
    let serviceId: string;

    beforeAll(async () => {
      // Create a service first
      const response = await request(app.getHttpServer())
        .post("/api/v1/catalog/pro/services")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          categoryId,
          rateType: "FIXED",
          fixedPriceBDT: 1500,
          notes: "Test service for deletion",
          isActive: true,
        });

      serviceId = response.body.id;
    });

    it("should delete professional service", () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/catalog/pro/services/${serviceId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            "message",
            "Service deleted successfully"
          );
        });
    });

    it("should fail with invalid service ID", () => {
      return request(app.getHttpServer())
        .delete("/api/v1/catalog/pro/services/invalid-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });
});






























